export default {
  routes: [
    { method: 'GET', path: '/stories', handler: 'story.ring', config: { policies: [] } },
    { method: 'POST', path: '/stories', handler: 'story.publish', config: { policies: [] } },
    { method: 'POST', path: '/stories/:id/view', handler: 'story.markViewed', config: { policies: [] } },
    { method: 'POST', path: '/stories/:id/reply', handler: 'story.reply', config: { policies: [] } },
  ],
};
