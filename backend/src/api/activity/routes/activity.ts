export default {
  routes: [
    {
      method: 'GET',
      path: '/dogs/:ref/activity/today',
      handler: 'activity.today',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/dogs/:ref/activity/week',
      handler: 'activity.week',
      config: { policies: [] },
    },
    { method: 'GET', path: '/activity/today', handler: 'activity.today', config: { policies: [] } },
    { method: 'GET', path: '/activity/week', handler: 'activity.week', config: { policies: [] } },
    { method: 'POST', path: '/walks/start', handler: 'activity.startWalk', config: { policies: [] } },
    { method: 'POST', path: '/walks/:id/stop', handler: 'activity.stopWalk', config: { policies: [] } },
    { method: 'GET', path: '/walks', handler: 'activity.listWalks', config: { policies: [] } },
    {
      method: 'GET',
      path: '/dogs/:ref/care-routines',
      handler: 'activity.careRoutines',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/care-routines',
      handler: 'activity.careRoutines',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/care-logs/toggle',
      handler: 'activity.toggleCareLog',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/dogs/:ref/care-insight',
      handler: 'activity.careInsight',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/care-insight',
      handler: 'activity.careInsight',
      config: { policies: [] },
    },
  ],
};
