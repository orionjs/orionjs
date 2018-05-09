export default () => ({
  page: {
    type: 'integer',
    defaultValue: 1,
    min: 1
  },
  limit: {
    type: 'integer',
    defaultValue: 20,
    min: 1,
    max: 200
  }
})
