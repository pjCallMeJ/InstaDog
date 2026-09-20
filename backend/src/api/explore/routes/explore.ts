export default {
  routes: [
    {
      method: 'GET',
      path: '/explore/categories',
      handler: 'explore.categories',
      config: { policies: [] },
    },
    { method: 'GET', path: '/explore', handler: 'explore.find', config: { policies: [] } },
    { method: 'GET', path: '/search', handler: 'explore.search', config: { policies: [] } },
  ],
};
