import PermissionsError from './PermissionsError'
import {OrionError} from './OrionError'
import {describe, it, expect} from 'vitest'

describe('PermissionsError', () => {
  it('should extend OrionError', () => {
    const error = new PermissionsError('read_document')
    expect(error).toBeInstanceOf(OrionError)
  })

  it('should set isPermissionsError to true', () => {
    const error = new PermissionsError('read_document')
    expect(error.isPermissionsError).toBe(true)
    expect(error.isOrionError).toBe(true)
    expect(error.isUserError).toBeUndefined()
  })

  it('should set code to "PermissionsError"', () => {
    const error = new PermissionsError('read_document')
    expect(error.code).toBe('PermissionsError')
  })

  it('should generate a default message with permissionErrorType', () => {
    const error = new PermissionsError('update_user')
    expect(error.message).toBe('Client is not allowed to perform this action [update_user]')
  })

  it('should support custom message in extra', () => {
    const error = new PermissionsError('delete_document', {
      message: 'You need admin rights to delete this document',
    })
    expect(error.message).toBe('You need admin rights to delete this document')
  })

  it('should store extra data', () => {
    const extraData = {
      documentId: '123',
      requiredRole: 'admin',
    }
    const error = new PermissionsError('read_document', extraData)

    expect(error.extra).toEqual(extraData)
  })

  it('should have a getInfo method that returns the correct structure', () => {
    const extraData = {documentId: '123', requiredRole: 'admin'}
    const error = new PermissionsError('read_document', extraData)

    const info = error.getInfo()
    expect(info).toEqual({
      ...extraData,
      error: 'PermissionsError',
      message: 'Client is not allowed to perform this action [read_document]',
      type: 'read_document',
    })
  })

  it('should include the permission type in getInfo', () => {
    const error = new PermissionsError('admin_action')
    const info = error.getInfo() as any
    expect(info.type).toBe('admin_action')
  })

  it('should have proper stack trace', () => {
    const error = new PermissionsError('read_document')
    expect(error.stack).toBeDefined()
    expect(error.stack.includes('PermissionsError.test.ts')).toBe(true)
  })
})
