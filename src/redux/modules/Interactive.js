import beam from '../utils/Beam'
import storage from 'electron-json-storage'
import _ from 'lodash'
import {
  toastr
} from 'react-redux-toastr'
import {
  actions as boardActions
} from './Board'

// Constants
export const constants = {
  INTERACTIVE_INITIALIZE: 'INTERACTIVE_INITIALIZE',
  START_INTERACTIVE: 'START_INTERACTIVE',
  STOP_INTERACTIVE: 'STOP_INTERACTIVE',
  SET_COOLDOWN_OPTION: 'SET_COOLDOWN_OPTION',
  TOGGLE_AUTO_RECONNECT: 'TOGGLE_AUTO_RECONNECT',
  UPDATE_RECONNECTION_TIMEOUT: 'UPDATE_RECONNECTION_TIMEOUT',
  COOLDOWN_UPDATED: 'COOLDOWN_UPDATED',
  UPDATE_STATIC_COOLDOWN: 'UPDATE_STATIC_COOLDOWN',
  UPDATE_SMART_COOLDOWN: 'UPDATE_SMART_COOLDOWN',
  CLEAR_INTERACTIVE: 'CLEAR_INTERACTIVE'
}

let timeout
const syncStorageWithState = (state) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    storage.set('interactive', state.storage, (err) => {
      if (err) {
        console.log('INTERACTIVE', err)
      }
    })
  }, 5000)
}

const getCooldownsForProfile = (id, profiles, sounds, globalCooldown) => {
  let cooldowns = []
  try {
    const profile = _.find(profiles, p => p.id === id)
    for (let i = 0; i < profile.sounds.length; i++) {
      const s = profile.sounds[i]
      const sound = _.find(sounds, so => so.id === s)
      if (sound) cooldowns.push(parseInt(sound.cooldown) * 1000)
      else cooldowns.push(0)
    }
  } catch (err) {
    // Something happened, set the default amount
    for (let i = 0; i <= 50; i++) {
      cooldowns = []
      cooldowns.push(globalCooldown)
    }
  }
  return cooldowns
}

// Action Creators
export const actions = {
  initialize: (data) => {
    return (dispatch) => {
      dispatch({
        type: constants.INTERACTIVE_INITIALIZE,
        payload: {
          loadedState: data
        }
      })
      console.log('Update cooldown')
      dispatch(actions.updateCooldown())
    }
  },
  setCooldownOption: (option) => {
    return (dispatch, getState) => {
      dispatch({
        type: constants.SET_COOLDOWN_OPTION,
        payload: {
          cooldownOption: option
        }
      })
      dispatch(actions.updateCooldown())
    }
  },
  updateCooldown: () => {
    return (dispatch, getState) => {
      const {
        interactive: {
          storage: {
            cooldownOption,
            staticCooldown,
            smartCooldown
          }
        },
        profiles: {
          profiles,
          profileId
        },
        sounds: {
          sounds
        }
      } = getState()
      const cooldowns = getCooldownsForProfile(profileId, profiles, sounds, staticCooldown)
      // TODO: smart cooldown increment
      beam.setCooldown(cooldownOption, staticCooldown, cooldowns, smartCooldown)
      dispatch({
        type: constants.COOLDOWN_UPDATED
      })
    }
  },
  toggleAutoReconnect: () => {
    return (dispatch, getState) => {
      const {
        interactive: {
          storage: {
            useReconnect
          }
        }
      } = getState()
      dispatch({
        type: constants.TOGGLE_AUTO_RECONNECT,
        payload: !useReconnect
      })
    }
  },
  updateReconnectionTimeout: (value) => {
    return {
      type: constants.UPDATE_RECONNECTION_TIMEOUT,
      payload: value
    }
  },
  goInteractive: (isDisconnect) => {
    return (dispatch, getState) => {
      const {
        interactive: {
          isConnected
        },
        board: {
          versionId,
          board: {
            scenes
          }
        },
        auth: {
          tokens
        },
        profiles: {
          profiles,
          profileId
        },
        sounds: {
          sounds
        }
      } = getState()
      const profile = _.find(profiles, p => p.id === profileId)
      const controls = scenes[0].controls
      const shouldConnect = !isConnected
      if (shouldConnect) {
        dispatch({
          type: 'GO_INTERACTIVE_PENDING'
        })
        beam.goInteractive(versionId, tokens.access, profile, sounds, controls)
          .then(res => {
            dispatch({
              type: 'GO_INTERACTIVE_FULFILLED'
            })
          })
          .catch(err => {
            dispatch({
              type: 'GO_INTERACTIVE_REJECTED'
            })
            toastr.error('Failed to Connect to Beam')
            dispatch(actions.robotClosedEvent())
            throw err
          })
      } else {
        dispatch({
          type: constants.STOP_INTERACTIVE
        })
        beam.stopInteractive(isDisconnect)
      }
    }
  },
  robotClosedEvent: () => {
    return (dispatch, getState) => {
      const {
        interactive: {
          isConnected,
          storage: {
            useReconnect,
            reconnectionTimeout
          }
        }
      } = getState()
      if (useReconnect && isConnected) {
        toastr.info('Connection Dropped. Reconnecting.')
        dispatch({
          type: constants.STOP_INTERACTIVE
        })
        setTimeout(() => {
          dispatch(actions.goInteractive())
        }, reconnectionTimeout)
      } else if (isConnected) {
        dispatch({
          type: constants.STOP_INTERACTIVE
        })
      }
    }
  },
  updateStaticCooldown: (value) => {
    return (dispatch, getState) => {
      dispatch({
        type: constants.UPDATE_STATIC_COOLDOWN,
        payload: {
          staticCooldown: parseInt(value)
        }
      })
      dispatch(actions.updateCooldown())
    }
  },
  updateSmartCooldown: (value) => {
    return (dispatch, getState) => {
      dispatch({
        type: constants.UPDATE_SMART_COOLDOWN,
        payload: {
          smartCooldown: parseInt(value)
        }
      })
      dispatch(actions.updateCooldown())
    }
  },
  clearInteractiveSettings: () => {
    return {
      type: constants.CLEAR_INTERACTIVE
    }
  },
  pingError: () => {
    toastr.error('Connection Error',
      'Uh oh! We\'re struggling to shake hands with Beam. Make sure your firewall isn\'t blocking us!', {
        timeOut: 15000
      })
    return (dispatch) => {
      dispatch(actions.robotClosedEvent())
      dispatch({
        type: 'PING_ERROR'
      })
    }
  },
  updateControls: () => {
    return (dispatch, getState) => {
      const {
        interactive: {
          isConnected
        },
        board: {
          board: {
            scenes
          }
        },
        profiles: {
          profiles,
          profileId
        },
        sounds: {
          sounds
        }
      } = getState()
      dispatch(boardActions.updateLocalLayout({
        scenes
      }))
      if (isConnected) {
        const profile = _.find(profiles, p => p.id === profileId)
        const controls = scenes[0].controls
        dispatch(actions.updateCooldown())
        beam.updateControls(profile, sounds, controls)
      }
    }
  }
}
// Action handlers
const ACTION_HANDLERS = {
  INTERACTIVE_INITIALIZE: (state, actions) => {
    const {
      payload: {
        loadedState
      }
    } = actions
    return {
      ...state,
      storage: {
        ...state.storage,
        ...loadedState
      }
    }
  },
  SET_COOLDOWN_OPTION: (state, actions) => {
    const {
      payload: {
        cooldownOption
      }
    } = actions
    return {
      ...state,
      storage: {
        ...state.storage,
        cooldownOption: cooldownOption
      }
    }
  },
  TOGGLE_AUTO_RECONNECT: (state, actions) => {
    const {
      payload
    } = actions
    return {
      ...state,
      storage: {
        ...state.storage,
        useReconnect: payload
      }
    }
  },
  UPDATE_RECONNECTION_TIMEOUT: (state, actions) => {
    const {
      payload
    } = actions
    return {
      ...state,
      storage: {
        ...state.storage,
        reconnectionTimeout: payload
      }
    }
  },
  GO_INTERACTIVE_FULFILLED: (state) => {
    return {
      ...state,
      isConnected: true,
      isConnecting: false
    }
  },
  GO_INTERACTIVE_PENDING: (state) => {
    return {
      ...state,
      isConnecting: true,
      isConnected: false
    }
  },
  GO_INTERACTIVE_REJECTED: (state) => {
    return {
      ...state,
      isConnected: false,
      isConnecting: false
    }
  },
  UPDATE_USER_COUNT: (state, actions) => {
    const {
      payload: {
        user_count
      }
    } = actions
    return {
      ...state,
      user_count: user_count
    }
  },
  STOP_INTERACTIVE: (state) => {
    return {
      ...state,
      isConnected: false,
      isConnecting: false
    }
  },
  UPDATE_STATIC_COOLDOWN: (state, action) => {
    const {
      payload: {
        staticCooldown
      }
    } = action
    return {
      ...state,
      storage: {
        ...state.storage,
        staticCooldown
      }
    }
  },
  UPDATE_SMART_COOLDOWN: (state, action) => {
    const {
      payload: {
        smartCooldown
      }
    } = action
    return {
      ...state,
      storage: {
        ...state.storage,
        smartCooldown
      }
    }
  },
  CLEAR_INTERACTIVE: (state) => {
    return {
      ...state,
      storage: {
        ...initialState.storage
      }
    }
  }
}
// Reducer
export const initialState = {
  isConnecting: false,
  isConnected: false,
  user_count: 0,
  storage: {
    cooldownOption: 'dynamic',
    staticCooldown: 5000,
    useReconnect: true,
    reconnectionTimeout: 3000,
    smartCooldown: 5000
  }
}
export default function (state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type]
  let newState
  if (handler) {
    newState = handler(state, action)
    if (action.type !== constants.INTERACTIVE_INITIALIZE) syncStorageWithState(newState)
  } else {
    newState = state
  }
  return newState
}
