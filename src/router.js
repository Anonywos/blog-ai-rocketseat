export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(body)
}

export function createRouter(routes) {
  const routeTable = routes
    .map((route) => {
      const segments = route.path.split('/')
      const specificity = segments.map((segment) => (segment.startsWith(':') ? '0' : '1')).join('')
      return { ...route, segments, specificity }
    })
    .sort((first, second) => second.specificity.localeCompare(first.specificity))

  return async (req, res) => {
    let requestUrl
    try {
      requestUrl = new URL(req.url, 'http://localhost')
    } catch {
      sendJson(res, 400, { error: 'Invalid request URL' })
      return
    }

    const pathSegments = requestUrl.pathname.split('/')
    const matches = routeTable.filter(
      ({ segments }) =>
        segments.length === pathSegments.length &&
        segments.every((segment, index) =>
          segment.startsWith(':') ? pathSegments[index] !== '' : segment === pathSegments[index],
        ),
    )
    if (matches.length === 0) {
      sendJson(res, 404, { error: 'Route not found' })
      return
    }

    // Literal segments take precedence at the same position.
    const candidates = matches.filter(({ specificity }) => specificity === matches[0].specificity)
    const route = candidates.find(({ method }) => method === req.method)
    if (!route) {
      const allow = [...new Set(candidates.map(({ method }) => method))].join(', ')
      sendJson(res, 405, { error: 'Method not allowed' }, { Allow: allow })
      return
    }

    let params
    try {
      params = Object.fromEntries(
        route.segments.flatMap((segment, index) =>
          segment.startsWith(':')
            ? [[segment.slice(1), decodeURIComponent(pathSegments[index])]]
            : [],
        ),
      )
    } catch {
      params = null
    }
    if (params === null || Object.values(params).some((value) => value.includes('\0'))) {
      sendJson(res, 400, { error: route.invalidParamsMessage ?? 'Invalid path parameters' })
      return
    }

    req.params = params
    req.query = requestUrl.searchParams
    try {
      await route.handler(req, res)
    } catch (error) {
      const message = route.errorMessage ?? 'Internal server error'
      console.error(`${message}:`, error)
      if (!res.headersSent) {
        sendJson(res, 500, { error: message })
      } else if (!res.writableEnded) {
        res.destroy(error)
      }
    }
  }
}
