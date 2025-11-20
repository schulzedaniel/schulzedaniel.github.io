export const EVENT_LIST_QUERY = `
  query EventList($limit: Int!) {
    eventCollection(order: yearIdentifier_DESC, limit: $limit) {
      items {
        sys { id }
        name
        yearIdentifier
      }
    }
  }
`;

export const EVENT_BY_YEAR_QUERY = `
  query EventByYear($year: Int!) {
    eventCollection(where: { yearIdentifier: $year }, limit: 1) {
      items {
        sys { id }
        name
        yearIdentifier
        description
        startTime
        endTime
        location
        ticketSaleLink
        image { url description }
        teamPhoto { url description }
        speakersCollection(limit: 48) {
          items {
            __typename
            ... on Speaker {
              name
              jobTitle
              linkedInProfileLink
              photo { url description }
            }
            ... on Host {
              name
              photo { url description }
              linkedin
            }
            ... on Performer {
              name
              title
              photo { url description }
            }
            ... on NewTeamMemberCard {
              firstName
              lastName
              positionTitle
            }
          }
        }
        hostsCollection(limit: 24) {
          items {
            __typename
            ... on Host {
              name
              photo { url description }
              linkedin
            }
            ... on Speaker {
              name
              jobTitle
              linkedInProfileLink
              photo { url description }
            }
            ... on Performer {
              name
              title
              photo { url description }
            }
            ... on NewTeamMemberCard {
              firstName
              lastName
              positionTitle
            }
          }
        }
        performersCollection(limit: 24) {
          items {
            __typename
            ... on Performer {
              name
              title
              photo { url description }
            }
            ... on Speaker {
              name
              jobTitle
              linkedInProfileLink
              photo { url description }
            }
            ... on NewTeamMemberCard {
              firstName
              lastName
              positionTitle
            }
          }
        }
        teamsCollection(limit: 12) {
          items {
            __typename
            ... on Team {
              name
              teamMembersCollection(limit: 60) {
                items {
                  __typename
                  ... on NewTeamMemberCard {
                    firstName
                    lastName
                    positionTitle
                    team
                    isLead
                    linkedInUrl
                    portrait { url description }
                  }
                  ... on TeamMember {
                    name
                    title
                    photo { url description }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
