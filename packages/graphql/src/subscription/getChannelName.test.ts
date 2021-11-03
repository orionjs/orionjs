import getChannelName from './getChannelName'

describe('Test channel name generation', () => {
  it('Should return different channel names with different params', () => {
    const channelName1 = getChannelName('test', {
      hello: 'world'
    })
    const channelName2 = getChannelName('test', {
      hello: 'country'
    })
    expect(channelName1).not.toEqual(channelName2)
  })

  it('Should return same channel names with same params', () => {
    const channelName1 = getChannelName('test', {
      hello: 'world'
    })
    const channelName2 = getChannelName('test', {
      hello: 'world'
    })
    expect(channelName1).toEqual(channelName2)
  })
})
