export default options =>
  function({requireUserId}, viewer) {
    if (requireUserId && !viewer.userId) {
      return 'notLoggedIn'
    }
  }
