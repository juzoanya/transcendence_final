
class Joo {

    protected enableUpdating(_requestedUpdate: boolean) { }

    private __updatePromise = new Promise<boolean>((res) => (this.enableUpdating = res));



    private __markUpdated() {
        this._$changedProperties = new Map();
        this.isUpdatePending = false;
    }


    _$didUpdate(changedProperties) {
        if (!this.hasUpdated) {
            this.hasUpdated = true;
            this.firstUpdated(changedProperties);
        }
        this.updated(changedProperties);
    }

    protected performUpdate(): void {
        if (!this.isUpdatePending) {
            return;
        }
        let shouldUpdate = false;
        const changedProperties = this._$changedProperties;
        try {
            shouldUpdate = this.shouldUpdate(changedProperties);
            if (shouldUpdate) {
                this.willUpdate(changedProperties);
                this.update(changedProperties);
            } else {
                this.__markUpdated();
            }
        } catch (e) {
            shouldUpdate = false;
            this.__markUpdated();
            throw e;
        }
        if (shouldUpdate) {
            this._$didUpdate(changedProperties);
        }
    }

    protected scheduleUpdate(): void | Promise<unknown> {
        const result = this.performUpdate();
        return result;
    }

    private async __enqueueUpdate() {
        this.isUpdatePending = true;
        try {
            await this.__updatePromise;
        } catch (e) {
            Promise.reject(e);
        }
        const result = this.scheduleUpdate();
        if (result != null) {
            await result;
        }
        return !this.isUpdatePending;
    }

    requestUpdate(): void {
        if (this.isUpdatePending === false) {
            this.__updatePromise = this.__enqueueUpdate();
        }
    }


    isUpdatePending = false;
    hasUpdated = false;
    _$changedProperties = new Map();

    firstUpdated(changed) { }
    updated(changed) { }
    willUpdate(changed) { }
    update(changed) {
        this.isUpdatePending = false;
    }
    shouldUpdate(changed) { return true; }
}