export default {
  routes: [
    { method: 'GET', path: '/me/profile', handler: 'me.profile', config: { policies: [] } },
    { method: 'PUT', path: '/me/profile', handler: 'me.updateProfile', config: { policies: [] } },
    { method: 'GET', path: '/me/dogs', handler: 'me.dogs', config: { policies: [] } },
    { method: 'POST', path: '/me/dogs', handler: 'me.addDog', config: { policies: [] } },
    { method: 'GET', path: '/me/saved', handler: 'me.saved', config: { policies: [] } },
  ],
};
