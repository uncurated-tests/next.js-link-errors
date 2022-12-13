const reportMap = new Map<string, string[]>()

export interface BrokenLinkReport {
  route: string
  href: string
}

function linkHasBeenCheckedThisSession({ route, href }: BrokenLinkReport) {
  const links = reportMap.get(route)
  return Boolean(links?.includes(href))
}

/**
 * EXPERIMENTAL: This function is not yet stable and may change at any time.
 * Reports a broken link if a webhook is defined in experimental.brokenLinkWebhook.
 * Checks if the link is already reported for the route in this client session before reporting.
 */
export async function reportBrokenLink({ route, href }: BrokenLinkReport) {
  if (process.env.__NEXT_BROKEN_LINK_WEBHOOK) {
    if (!linkHasBeenCheckedThisSession({ route, href })) {
      const links = reportMap.get(route) || []
      links.push(href)
      reportMap.set(route, links)
      try {
        await fetch(process.env.__NEXT_BROKEN_LINK_WEBHOOK, {
          mode: 'no-cors',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route,
            links,
          }),
        })
      } catch {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Failed to report ${href} as a broken link on ${route}`)
        }
      }
    }
  }
}

export async function checkExternalLinkHeaders({
  route,
  href,
}: BrokenLinkReport) {
  const { protocol } = window.location
  // don't fetch if the link doesn't match the current page's protocol, which prevents errors in the console
  if (
    !linkHasBeenCheckedThisSession({ route, href }) &&
    route.startsWith(protocol)
  ) {
    try {
      const res = await fetch(href, { method: 'HEAD' })
      if (res.status >= 400) {
        reportBrokenLink({ route: window.location.pathname, href })
      }
    } catch {
      console.error('Failed to check external link headers')
    }
  }
}
