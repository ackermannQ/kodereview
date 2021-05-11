import { graphql, useStaticQuery } from "gatsby"
import PropTypes from "prop-types"
/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react"
import { Helmet } from "react-helmet"

import favicon from '../images/stuff.png'

const Seo = ({ description, lang, meta, title }) => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            social {
              linkedIn
            }
          }
        }
      }
    `
  )

  const metaDescription = description || site.siteMetadata.description
  const defaultTitle = site.siteMetadata?.title

  return (
    <Helmet
      htmlAttributes={{
        lang,
      }}
      title={title}
      titleTemplate={defaultTitle ? `%s | ${defaultTitle}` : null}
      meta={[
        {
          name: `description`,
          content: metaDescription,
        },
        {
          property: `og:title`,
          content: title,
        },
        {
          property: `og:description`,
          content: metaDescription,
        },
        {
          property: `og:type`,
          content: `website`,
        },
        {
          name: `linkedIn:card`,
          content: `summary`,
        },
        {
          name: `linkedIn:creator`,
          content: site.siteMetadata?.social?.linkedIn || ``,
        },
        {
          name: `linkedIn:title`,
          content: title,
        },
        {
          name: `linkedIn:description`,
          content: metaDescription,
        },
      ].concat(meta)}
    >
      <meta name="google-site-verification" content="bNa8ONaRFQf-qekSzPK8RIeCBasCm-FAcYHzy2Wiesc" />
      <link rel="icon" href={favicon} />
    </Helmet>
  )
}

Seo.defaultProps = {
  lang: `en`,
  meta: [],
  description: ``,
}

Seo.propTypes = {
  description: PropTypes.string,
  lang: PropTypes.string,
  meta: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string.isRequired,
}

export default Seo
