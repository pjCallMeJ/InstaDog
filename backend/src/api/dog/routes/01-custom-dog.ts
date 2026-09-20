export default {
  routes: [
    { method: 'GET', path: '/dogs/:ref/profile', handler: 'dog.profile', config: { policies: [] } },
    { method: 'GET', path: '/dogs/:ref/posts', handler: 'dog.posts', config: { policies: [] } },
    { method: 'GET', path: '/dogs/:ref/photos', handler: 'dog.photos', config: { policies: [] } },
    { method: 'GET', path: '/dogs/:ref/about', handler: 'dog.about', config: { policies: [] } },
    { method: 'POST', path: '/dogs/:ref/follow', handler: 'dog.toggleFollow', config: { policies: [] } },
    { method: 'GET', path: '/dogs/:ref/followers', handler: 'dog.followers', config: { policies: [] } },
    { method: 'GET', path: '/dogs/:ref/following', handler: 'dog.following', config: { policies: [] } },
  ],
};
