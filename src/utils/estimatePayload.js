const UNNAMED = 'Unnamed'

export function resolveName(value) {
  const trimmed = (value ?? '').trim()
  return trimmed || UNNAMED
}

export function estimateDisplayName(companyName) {
  return `${resolveName(companyName)}'s Estimate`
}

export function buildEstimateRow({
  companyName, clientName, courseName, selected, selectedKeys, catStates,
  marginPct, liveHours, internalCost, clientPrice,
  hasPptsWebinars, elearningLiked, liveCourseAnswer, existingToolAnswer,
}) {
  const adaEnabled      = {}
  const moduleCounts    = {}
  const additionalMins  = {}
  let additionalVideos  = []

  for (const key of selectedKeys) {
    const cat = catStates[key]
    additionalMins[key] = cat.additionalMinutes ?? 0
    if (key === 'microvideo') {
      additionalVideos = cat.additionalVideos ?? []
    } else {
      if (cat.adaEnabled) adaEnabled[key] = true
      moduleCounts[key] = cat.moduleCount ?? 1
    }
  }

  return {
    company_name:       resolveName(companyName),
    client_name:        resolveName(clientName),
    course_name:        resolveName(courseName),
    categories:         selectedKeys,
    internal_cost:      Number(internalCost.toFixed(2)),
    client_price:       Number(clientPrice.toFixed(2)),
    margin_pct:         marginPct,
    ada_enabled:        adaEnabled,
    module_counts:      moduleCounts,
    additional_mins:    additionalMins,
    additional_videos:  additionalVideos,
    state_json: {
      catStates, selected, companyName, clientName, courseName, marginPct, liveHours,
      hasPptsWebinars, elearningLiked, liveCourseAnswer, existingToolAnswer,
    },
  }
}
