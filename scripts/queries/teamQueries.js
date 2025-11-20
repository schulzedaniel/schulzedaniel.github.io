export const TEAM_BY_YEAR_QUERY = `
  query TeamByYear($year: Int!, $limit: Int!) {
    newTeamMemberCardCollection(
      where: { year: $year }
      order: [team_ASC, isLead_DESC, firstName_ASC]
      limit: $limit
    ) {
      items {
        firstName
        lastName
        positionTitle
        team
        year
        isLead
        linkedInUrl
        portrait { url description }
      }
    }
  }
`;
