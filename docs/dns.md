# DNS (Namecheap → Cloudflare → Vercel)

## Roles

- **Namecheap** — domain registrar. Only change here: set nameservers to Cloudflare's.
- **Cloudflare** — authoritative DNS. **DNS-only** records for the app (grey cloud);
  do not proxy Vercel traffic through Cloudflare's CDN.
- **Vercel** — hosting + TLS (automatic certs once the domain is verified).

## Step 1 — Point Namecheap at Cloudflare

Namecheap → Domain List → Manage → Nameservers → Custom DNS:
```
xxxx.ns.cloudflare.com
yyyy.ns.cloudflare.com
```
(the exact pair Cloudflare shows when you add the site). Propagation: up to 24h.

## Step 2 — App records in Cloudflare

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `76.76.21.21` | DNS only |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

Then in Vercel → Project → Domains, add `example.com` and `www.example.com` and follow
the verification prompt. Vercel issues the certificate.

> Use the exact apex/CNAME targets Vercel shows in its dashboard — they can differ per
> account/region. The values above are the common defaults.

## Step 3 — Email authentication for Resend (Phase 7)

Add the records Resend generates for your sending subdomain (e.g. `send.example.com`):

| Type | Name | Value | Proxy |
|---|---|---|---|
| MX | `send` | `feedback-smtp.<region>.amazonses.com` (priority 10) | DNS only |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| TXT | `resend._domainkey` | (DKIM key from Resend) | — |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@example.com` | — |

## Step 4 — Webhooks

No DNS work; just register the URLs on each provider:

- Clerk: `https://example.com/api/webhooks/clerk`
- Stripe: `https://example.com/api/webhooks/stripe`

## Verification

```
dig +short example.com
dig +short www.example.com
curl -sI https://example.com | grep -i server   # expect Vercel
npx resend domains verify                        # Phase 7
```
