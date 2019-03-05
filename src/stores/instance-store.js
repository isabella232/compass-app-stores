import { createStore } from 'redux';
import reducer from 'modules/instance';

import MongoDBInstance from 'mongodb-instance-model';
import { reset } from 'modules/instance/reset';
import { changeInstance } from 'modules/instance/instance';
import { changeErrorMessage } from 'modules/instance/error-message';
import { changeDataService } from 'modules/instance/data-service';

const store = createStore(reducer);

store.handleError = (model, resp, options) => {
  const err = options.error.arguments[2];
  if (err) {
    store.dispatch(changeErrorMessage(err));
  }

  const StatusAction = global.hadronApp.appRegistry.getAction('Status.Actions');
  StatusAction.hide();
};

store.refreshInstance = () => {
  if (store.getState().instance.fetch) {
    const StatusAction = global.hadronApp.appRegistry.getAction('Status.Actions');
    if (StatusAction) {
      StatusAction.configure({
        animation: true,
        message: 'Loading databases',
        visible: true
      });
    }
    store.getState().instance.fetch({
      error: store.handleError,
      success: (instance) => {
        store.dispatch(changeInstance(instance));
        StatusAction.hide();
      },
      dataService: store.getState().dataService
    });
    // store.getState().dataService.instance({}, (err, i) => {
    //   store.dispatch(changeInstance(i));
    // });
  }
};

store.onActivated = (appRegistry) => {
  // Events emitted from the app registry:
  appRegistry.on('data-service-disconnected', () => {
    global.hadronApp.instance = new MongoDBInstance();
    store.dispatch(reset());
  });

  appRegistry.on('data-service-connected', (err, ds) => {
    if (!err) {
      store.dispatch(changeDataService(ds));
    }
    // Was previously onFirstFetch action, which was triggered from data-service-connected in the home plugin
    const StatusAction = appRegistry.getAction('Status.Actions');
    if (StatusAction) {
      StatusAction.hide();
    }

    store.dispatch(changeInstance(global.hadronApp.instance));
    store.refreshInstance();
  });

  appRegistry.on('refresh-data', () => {
    store.refreshInstance();
  });

  appRegistry.on('agg-pipeline-out-executed', () => {
    store.refreshInstance();
  });

  store.subscribe(() => {
    const state = store.getState();
    console.log('EMITTING STATE:');
    console.log(state);
    appRegistry.emit('instance-refreshed', state);
  });
};

export default store;
