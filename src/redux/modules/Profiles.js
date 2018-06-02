import storage from 'electron-json-storage'
import {
  toastr
} from 'react-redux-toastr'
import _ from 'lodash'
import cuid from 'cuid'
import {
  arrayMove
} from 'react-sortable-hoc'
import DevLabUtil from '../utils/DevLabUtil'
import {
  actions as interactiveActions
} from './Interactive'
import {
  actions as soundActions
} from './Sounds'

// Constants
export const constants = {
  PROFILES_INITIALIZE: 'PROFILES_INITIALIZE',
  ADD_PROFILE: 'ADD_PROFILE',
  REMOVE_PROFILE: 'REMOVE_PROFILE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  SORT_PROFILES: 'SORT_PROFILES',
  CLEAR_ALL_PROFILES: 'CLEAR_ALL_PROFILES',
  SELECT_PROFILE: 'SELECT_PROFILE',
  ASSIGN_SOUNDS: 'ASSIGN_SOUNDS',
  TOGGLE_PROFILE_LOCK: 'TOGGLE_PROFILE_LOCK'
}

let timeout
const syncStorageWithState = (state) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    storage.set('profiles', state, (err) => {
      if (err) throw err
    })
  }, 5000)
}

const scrubArray = (arr) => {
  while (arr.length > 0 && !arr[arr.length - 1]) arr.pop()
  return arr
}

// Action Creators
export const actions = {
  initialize: (data) => {
    return (dispatch, getState) => {
      dispatch({
        type: constants.PROFILES_INITIALIZE,
        payload: {
          loadedState: data
        }
      })
    }
  },
  addProfile: (name) => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profiles
        }
      } = getState()
      let newProfiles = Object.assign([], profiles)
      const newProfile = DevLabUtil.createProfile(cuid(), name)
      newProfiles.push(newProfile)
      dispatch({
        type: constants.ADD_PROFILE,
        payload: {
          profiles: newProfiles
        }
      })
    }
  },
  sortProfiles: (oldIndex, newIndex) => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profiles
        }
      } = getState()
      const sortedProfiles = arrayMove(profiles, oldIndex, newIndex)
      dispatch({
        type: constants.SORT_PROFILES,
        payload: {
          profiles: sortedProfiles
        }
      })
    }
  },
  removeProfile: (index) => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profiles
        }
      } = getState()
      const newProfiles = Object.assign([], profiles)
      const removeProfile = newProfiles.splice(index, 1)
      toastr.success(removeProfile[0].name + ' Removed!')
      dispatch({
        type: constants.REMOVE_PROFILE,
        payload: {
          profiles: newProfiles
        }
      })
    }
  },
  editProfile: (id, name) => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profiles
        }
      } = getState()
      const newProfiles = Object.assign([], profiles)
      newProfiles.map((profile) => {
        if (profile.id === id) {
          profile.name = name
        }
      })
      toastr.success('Profile Updated!')
      dispatch({
        type: constants.EDIT_PROFILE,
        payload: {
          profiles: newProfiles
        }
      })
    }
  },
  selectProfile: (profileId) => {
    return (dispatch) => {
      dispatch({
        type: constants.SELECT_PROFILE,
        payload: {
          profileId: profileId
        }
      })
      if (profileId) {
        dispatch(interactiveActions.updateControls())
      }
    }
  },
  assignSound: (index, sound) => {
    if (!sound) return
    return (dispatch, getState) => {
      const {
        profiles: {
          profileId,
          profiles
        }
      } = getState()
      let newProfiles = Object.assign([], profiles)
      let idx = 0
      let profile = _.find(profiles, (p, i) => {
        if (p.id === profileId) {
          idx = i
          return true
        }
      })
      if (!profile) return
      let newSounds = Object.assign([], profile.sounds)
      newSounds[index] = sound.id
      newSounds = scrubArray(newSounds)
      profile.sounds = newSounds
      newProfiles.splice(idx, 1, profile)
      dispatch({
        type: constants.ASSIGN_SOUNDS,
        payload: {
          profiles: newProfiles
        }
      })
      dispatch(interactiveActions.updateControls())
    }
  },
  unassignSound: (index) => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profileId,
          profiles
        }
      } = getState()
      let newProfiles = Object.assign([], profiles)
      let idx = 0
      let profile = _.find(profiles, (p, i) => {
        if (p.id === profileId) {
          idx = i
          return true
        }
      })
      if (!profile) {
        dispatch({
          type: constants.ASSIGN_SOUNDS,
          payload: {
            profiles: profiles
          }
        })
      } else {
        let newSounds = Object.assign([], profile.sounds)
        newSounds[index] = null
        newSounds = scrubArray(newSounds)
        profile.sounds = newSounds
        newProfiles.splice(idx, 1, profile)
        dispatch({
          type: constants.ASSIGN_SOUNDS,
          payload: {
            profiles: newProfiles
          }
        })
        dispatch(interactiveActions.updateControls())
      }
    }
  },
  toggleLock: () => {
    return (dispatch, getState) => {
      const {
        profiles: {
          profileId,
          profiles
        }
      } = getState()
      const newProfiles = Object.assign([], profiles)
      for (let i = 0; i <= newProfiles.length; i++) {
        if (newProfiles[i].id === profileId) {
          newProfiles[i].locked = !newProfiles[i].locked
          break
        }
      }
      dispatch({
        type: constants.TOGGLE_PROFILE_LOCK,
        payload: {
          profiles: newProfiles
        }
      })
    }
  },
  clearProfiles: () => {
    return {
      type: constants.CLEAR_ALL_PROFILES
    }
  }
}
// Action handlers
const ACTION_HANDLERS = {
  PROFILES_INITIALIZE: (state, actions) => {
    const {
      payload: {
        loadedState
      }
    } = actions
    return {
      ...state,
      ...loadedState
    }
  },
  ADD_PROFILE: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  SORT_PROFILES: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  REMOVE_PROFILE: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  EDIT_PROFILE: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  SELECT_PROFILE: (state, actions) => {
    const {
      payload: {
        profileId
      }
    } = actions
    return {
      ...state,
      profileId: profileId
    }
  },
  ASSIGN_SOUNDS: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  TOGGLE_PROFILE_LOCK: (state, actions) => {
    const {
      payload: {
        profiles
      }
    } = actions
    return {
      ...state,
      profiles: profiles
    }
  },
  CLEAR_ALL_PROFILES: (state) => {
    return {
      ...state,
      profiles: [],
      profileId: ''
    }
  }
}
// Reducer
export const initialState = {
  profiles: [],
  profileId: ''
}
export default function (state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type]
  let newState
  if (handler) {
    newState = handler(state, action)
    if (action.type !== constants.PROFILES_INITIALIZE) syncStorageWithState(newState)
  } else {
    newState = state
  }
  return newState
}
