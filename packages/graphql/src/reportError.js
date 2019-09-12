export default async function(options, error, context) {
  if (!options || !options.pm2io) return
  if (error.isValidationError) return
  if (error.isUserError) return
  if (error.isPermissionsError) return

  options.pm2io.notifyError(error, {
    // or anything that you can like an user id
    custom: context
  })
}
