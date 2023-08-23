# Orionjs Crypto

This project provides utility functions for symmetric and asymmetric encryption, decryption, signing, and hashing. It uses the crypto and bcryptjs libraries for cryptographic operations.

## Symmetric Encryption

The symmetric encryption module provides functions for generating passwords and for encrypting and decrypting text. This can be used for securely storing sensitive data like user passwords.

```ts
import {symmetric} from './src/utils/symmetric'

const password = symmetric.generatePassword()
const encrypted = symmetric.encrypt('hello world', password)
const decrypted = symmetric.decrypt(encrypted, password)
```

## Asymmetric Encryption

The asymmetric encryption module provides functions for generating key pairs, and for encrypting and decrypting messages. This can be used for secure communication between two parties.

```ts
import {asymmetric} from './src/utils/asymmetric'

const {encryptKey, decryptKey} = asymmetric.generateKeys()
const encrypted = asymmetric.encrypt(encryptKey, 'hello')
const decrypted = asymmetric.decrypt(decryptKey, encrypted)
```

## Signing

The signing module provides functions for signing a payload and for verifying a signed payload. This can be used to ensure the integrity and authenticity of data.

```ts
import {sign} from './src/utils/sign'

const secret = 'my_secret'
const payload = 'hello world'
const checksum = sign.sign(payload, secret)
const isValid = sign.verify(payload, checksum, secret)
```

## Hashing

The hashing module provides functions for creating a hash from a text and for comparing a text with a hash. This can be used for storing sensitive data like passwords in a secure way.

```ts
import {hash} from './src/utils/hash'

const text = 'hello world'
const hashed = hash.hash(text)
const isSame = hash.compare(text, hashed)
```

## Hashing with Salt

The hashing with salt module provides functions for creating a hash from a password with a salt and for comparing a password with a hash. This can be used for storing user passwords in a secure way.

```ts
import {hashWithSalt} from './src/utils/hashWithSalt'

const password = 'password'
const hashed = hashWithSalt.hash(password)
const isSame = hashWithSalt.compare(password, hashed)
```
