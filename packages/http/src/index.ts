import {setOnError, onError} from './errors'
import {getViewer, setGetViewer} from './viewer'
import {startServer, getApp} from './start'
import express from 'express'
import route from './routes/route'

export {express, startServer, getApp, getViewer, setGetViewer, setOnError, onError, route}
