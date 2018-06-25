import {resolver} from '@orion-js/app'
import Product from '../../Product'
import getProduct from '../../stripe/getProduct'

export default resolver({
  returns: Product,
  async resolve({productId}, viewer) {
    return getProduct(productId)
  }
})
