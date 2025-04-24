export default (Users) => {
  return Users.encrypted ? Users.encrypted : Users
}
