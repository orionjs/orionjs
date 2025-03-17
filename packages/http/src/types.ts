import express from 'express'
import {OptionsJson, OptionsText, OptionsUrlencoded} from 'body-parser'
import {InferSchemaType, Schema, SchemaFieldType} from '@orion-js/schema'

export interface RouteResponseObject<
  TReturnsSchema extends SchemaFieldType | undefined = undefined,
> {
  statusCode?: number
  headers?: {[key: string]: string}
  body: TReturnsSchema extends undefined ? string | object : InferSchemaType<TReturnsSchema>
}

export type RouteResponse<TReturnsSchema extends SchemaFieldType = any> =
  // biome-ignore lint/suspicious/noConfusingVoidType: it's not confusing, it's a valid type.
  Promise<RouteResponseObject<TReturnsSchema> | void>

export type OrionRequest<
  TPath extends string = string,
  TQueryParamsSchema extends Schema | undefined = any,
  TBodyParamsSchema extends Schema | undefined = any,
> = express.Request<
  InferPathParams<TPath>,
  any,
  InferSchemaType<TBodyParamsSchema>,
  InferSchemaType<TQueryParamsSchema>
>

export type RouteResolve<
  TPath extends string,
  TQueryParamsSchema extends Schema | undefined,
  TBodyParamsSchema extends Schema | undefined,
  TReturnsSchema extends SchemaFieldType | undefined,
> = (
  req?: OrionRequest<TPath, TQueryParamsSchema, TBodyParamsSchema>,
  res?: express.Response,
  viewer?: any,
) => RouteResponse<TReturnsSchema>

type InferPathParam<Path, NextPart> = Path extends `:${infer OptionalParam}?`
  ? {[K in OptionalParam]?: string} & NextPart
  : Path extends `:${infer Param}`
    ? {[K in Param]: string} & NextPart
    : NextPart

type Simplify<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Simplify<O[K]>}
    : never
  : T

type InternalPathParams<Path> = Path extends `${infer Segment}/${infer Rest}`
  ? InferPathParam<Segment, InferPathParams<Rest>>
  : InferPathParam<Path, {}>

export type InferPathParams<Path> = Simplify<InternalPathParams<Path>>

export interface OrionRouteOptions<
  TPath extends string,
  TQueryParamsSchema extends Schema | undefined,
  TBodyParamsSchema extends Schema | undefined,
  TReturnsSchema extends SchemaFieldType | undefined,
> {
  /**
   * The path of the requests to match.
   */
  path: TPath

  /**
   * The schema of the path params. If not provided, the path params will be undefined.
   * Path params will be cleaned and validated using the schema.
   */
  // pathParams?: TPathParamsSchema
  /**
   * The schema of the body params. If not provided, the body params will be undefined.
   * Body params will be cleaned and validated using the schema.
   */
  bodyParams?: TBodyParamsSchema
  /**
   * The schema of the query params. If not provided, the query params will be undefined.
   * Query params will be cleaned and validated using the schema.
   */
  queryParams?: TQueryParamsSchema
  /**
   * The schema of the return body. If provided, the body will be only cleaned agains this schema, not validated.
   */
  returns?: TReturnsSchema

  /**
   * The http method of the requests to match.
   */
  method: 'get' | 'post' | 'put' | 'delete' | 'all'
  /**
   * Select the body parser to use for this route.
   */
  bodyParser?: 'json' | 'text' | 'urlencoded'
  /**
   * Selected body parser options.
   */
  bodyParserOptions?: OptionsJson | OptionsText | OptionsUrlencoded
  /**
   * Add a middleware to the route.
   * See https://expressjs.com/en/4x/api.html#middleware
   * for more information.
   */
  middlewares?: Array<express.RequestHandler>
  resolve: RouteResolve<TPath, TQueryParamsSchema, TBodyParamsSchema, TReturnsSchema>

  /**
   * Pass another express app
   */
  app?: express.Application
}

export type RouteType<
  TPath extends string = string,
  TQueryParamsSchema extends Schema | undefined = any,
  TBodyParamsSchema extends Schema | undefined = any,
  TReturnsSchema extends SchemaFieldType | undefined = any,
> = OrionRouteOptions<TPath, TQueryParamsSchema, TBodyParamsSchema, TReturnsSchema>

export interface RoutesMap {
  [key: string]: RouteType<any, any, any, any>
}

export type Request = express.Request
export type Response = express.Response
