# Astro Dev Blog

This blog was written with the help of the [Astro](https://astro.build/) static site generator, tested on version 5.1.1-5.1.6. It is tentatively named **Thoughts.toString()** and hosted at [https://blog.jacha.dev](https://blog.jacha.dev). The styling is basic, but functional. It has been tested to work on the latest versions of Chrome, Edge and Firefox, on desktop and an Android phone. It supports light and dark themes.

## Customized Shiki Code Block

A lot of thought was put particularly into the syntax highlighted code block, which is built on top of a [Shiki](https://shiki.matsu.io/) integration, which numerous [Transformers](https://shiki.matsu.io/guide/transformers) altering the way it looks and behaves. More information about this can be found [https://blog.jacha.dev/2024-12-10-code-block-reference.html](https://blog.jacha.dev/2024-12-10-code-block-reference.html)

## Hosting

Since it's a static site, I can get away with avoiding spinning up a server and/or database altogether. Serverless functions aren't expensive today, but [AWS S3](https://aws.amazon.com/s3/) buckets are even cheaper. Instead of hosting it as a static website host directly, traffic is routed through [AWS Cloudfront](https://aws.amazon.com/cloudfront/) CDN for HTTPS support and basic DDoS protection with [AWS Shield](https://aws.amazon.com/shield/). Astro automatically appends hashes to assets for cache busting.

An step-by-step guide for how this is all set up can be found here:
1. [Deploy a static site onto AWS: Static website hosting using AWS S3 [Part 1]](https://blog.jacha.dev/2025-01-18-deploy-a-static-site-onto-aws-static-website-hosting-using-aws-s3-part-1.html)
2. [Deploy a static site onto AWS: HTTPS to an S3 origin the right way using AWS Cloudfront [Part 2]](https://blog.jacha.dev/2025-01-21-deploy-a-static-site-onto-aws-https-to-an-s3-origin-the-right-way-using-aws-cloudfront-part-2.html)
3. [Deploy a static site: Synchronize the dev environment to S3 buckets using AWS CLI [Part 3]](https://blog.jacha.dev/2025-01-25-deploy-a-static-site-synchronize-the-dev-environment-to-s3-buckets-using-aws-cli-part-3.html)
4. [Astro and Cloudfront: Some cache busting techniques](https://blog.jacha.dev/2025-01-28-astro-and-cloudfront-some-cache-busting-techniques.html)

