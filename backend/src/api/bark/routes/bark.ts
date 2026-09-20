export default {
  routes: [
    { method: 'GET', path: '/bark/thread', handler: 'bark.thread', config: { policies: [] } },
    { method: 'POST', path: '/bark/messages', handler: 'bark.sendMessage', config: { policies: [] } },
    {
      method: 'GET',
      path: '/bark/grooming-styles',
      handler: 'bark.groomingStyles',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/bark/grooming-bookings',
      handler: 'bark.createBooking',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/dogs/:ref/nutrition-plan',
      handler: 'bark.nutritionPlan',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/nutrition-plan',
      handler: 'bark.nutritionPlan',
      config: { policies: [] },
    },
  ],
};
