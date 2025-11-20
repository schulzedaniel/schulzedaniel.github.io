export const STATIC_IMAGE_QUERY = `
  query StaticImageByCode($code: String!, $limit: Int!) {
    imageStaticCollection(where: { code: $code }, limit: $limit) {
      items {
        code
        altDiscription
        file { url description }
      }
    }
  }
`;
