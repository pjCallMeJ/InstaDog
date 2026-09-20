export default {
  routes: [
    {
      method: 'GET',
      path: '/feed',
      handler: 'feed.find',
      config: { policies: [] },
    },
  ],
};
