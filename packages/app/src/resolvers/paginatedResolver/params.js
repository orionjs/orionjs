export default ({params}) => ({
  page: {
    type: 'integer',
    defaultValue: 1,
    min: 1
  },
  limit: {
    type: 'integer',
    defaultValue: 0,
    min: 0,
    max: 200
  },
  ...params
})
