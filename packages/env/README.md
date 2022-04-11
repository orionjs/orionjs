# Orion Env

> This package works as standlaone package. It does not depend on any other orionjs package.

Orion Env is a utility for managing a collection of secrets in source control. The secrets are encrypted using public key, elliptic curve cryptography.

It's like dotEnv but saved in source control.

## Creating a new Env config file

Run the following script in a project that has the package installed. Save the password output because you will need to use it to decrypt the keys.

    yarn orion-env init --path=<path>

## Adding a new env variable

Run the following script in a project that has the package installed and you will be prompted for the variable name and value.

    yarn orion-env add --path=<path>

## Using in your app

Define the following environment variables (in the old way):

- `ORION_ENV_FILE_PATH=<path>` The path to the env file.
- `ORION_ENV_SECRET_KEY=<password>` The password to decrypt the keys.

Then you can access the variables by importing the package and all the env variables defined will be the env object.

    import {env} from '@orion-js/env'

    env.XX

## Setting environment variables (process.env)

To add backwards compatibility you can also use this libary to set the environment variables.

    import {loadEnv} from '@orion-js/env'

    loadEnv(options)

This will set the environment variables for the current process.

Options:

- `secretKey` Secret password used to decrypt the encrypted env file. Default: process.env.ORION_ENV_SECRET_KEY
- `envFilePath` Location of the file to read. Default: process.env.ORION_ENV_FILE_PATH
- `override` Set to true to set the environment variables even if the variable was already set. Default: process.env.ORION_ENV_OVERRIDE
