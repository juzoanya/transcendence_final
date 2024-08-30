/* eslint-disable no-unused-vars */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */

import { expect, test } from 'vitest';
import { SocketStateC } from './Socket';

test('test Socket States', {}, () => {
    const state = new SocketStateC();
    expect(state.state === 'closed').toBe(true);
    expect(state.isClosed()).toBe(true);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('connected')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('closed')).toThrowError();

    state.setState('connecting');
    expect(state.state === 'initial_connecting').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(true);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(true);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('connected');
    expect(state.state === 'initial_connected').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(true);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(true);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
});

test('test Socket disconnect', {}, () => {
    const state = new SocketStateC();
    state.setState('connecting');
    state.setState('connected');

    state.setState('disconnected');
    expect(state.state === 'disconnected').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(true);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('connecting');
    expect(state.state === 'reconnecting').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(true);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(true);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('connected');
    expect(state.state === 'reconnected').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(true);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(true);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
});

test('test Socket close', {}, () => {
    const state = new SocketStateC();
    state.setState('connecting');
    state.setState('connected');

    state.setState('closing');
    expect(state.state === 'closing').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(true);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('closed');
    expect(state.state === 'closed').toBe(true);
    expect(state.isClosed()).toBe(true);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('connecting');
    expect(state.state === 'initial_connecting').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(false);
    expect(state.isConnecting()).toBe(true);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(false);
    expect(state.isInitialConnecting()).toBe(true);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('closing')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('disconnected')).toThrowError();

    state.setState('connected');
    expect(state.state === 'initial_connected').toBe(true);
    expect(state.isClosed()).toBe(false);
    expect(state.isClosing()).toBe(false);
    expect(state.isConnected()).toBe(true);
    expect(state.isConnecting()).toBe(false);
    expect(state.isDisconnected()).toBe(false);
    expect(state.isInitialConnected()).toBe(true);
    expect(state.isInitialConnecting()).toBe(false);
    expect(state.isReconnected()).toBe(false);
    expect(state.isReconnecting()).toBe(false);

    expect(() => state.setState('closed')).toThrowError();
    expect(() => state.setState('connecting')).toThrowError();
    expect(() => state.setState('connected')).toThrowError();
});
