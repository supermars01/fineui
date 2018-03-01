/**
 *
 * @class BI.SingleSelectCombo
 * @extends BI.Single
 */
BI.SingleSelectCombo = BI.inherit(BI.Single, {

    _defaultConfig: function () {
        return BI.extend(BI.SingleSelectCombo.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-single-select-combo",
            itemsCreator: BI.emptyFn,
            valueFormatter: BI.emptyFn,
            height: 28
        });
    },

    _init: function () {
        BI.SingleSelectCombo.superclass._init.apply(this, arguments);
        var self = this, o = this.options;

        var assertShowValue = function () {
            BI.isKey(self._startValue) && (self.storeValue = self._startValue);
            self.trigger.getSearcher().setState(self.storeValue);
        };
        this.storeValue = "";
        // 标记正在请求数据
        this.requesting = false;

        this.trigger = BI.createWidget({
            type: "bi.single_select_trigger",
            height: o.height,
            // adapter: this.popup,
            masker: {
                offset: {
                    left: 1,
                    top: 1,
                    right: 2,
                    bottom: 33
                }
            },
            valueFormatter: o.valueFormatter,
            itemsCreator: function (op, callback) {
                o.itemsCreator(op, function (res) {
                    if (op.times === 1 && BI.isNotNull(op.keywords)) {
                        // 预防trigger内部把当前的storeValue改掉
                        self.trigger.setValue(self.getValue());
                    }
                    callback.apply(self, arguments);
                });
            }
        });

        this.trigger.on(BI.SingleSelectTrigger.EVENT_START, function () {
            self._setStartValue("");
            this.getSearcher().setValue(self.storeValue);
        });
        this.trigger.on(BI.SingleSelectTrigger.EVENT_STOP, function () {
            self._setStartValue("");
        });
        this.trigger.on(BI.SingleSelectTrigger.EVENT_PAUSE, function () {
            if (this.getSearcher().hasMatched()) {
                var keyword = this.getSearcher().getKeyword();
                self._join({
                    type: BI.Selection.Multi,
                    value: [keyword]
                }, function () {
                    self.combo.setValue(self.storeValue);
                    self._setStartValue(keyword);
                    assertShowValue();
                    self.populate();
                    self._setStartValue("");
                });
            }
        });
        this.trigger.on(BI.SingleSelectTrigger.EVENT_SEARCHING, function (keywords) {
            var last = BI.last(keywords);
            keywords = BI.initial(keywords || []);
            if (keywords.length > 0) {
                self._joinKeywords(keywords, function () {
                    if (BI.isEndWithBlank(last)) {
                        self.combo.setValue(self.storeValue);
                        assertShowValue();
                        self.combo.populate();
                        self._setStartValue("");
                    } else {
                        self.combo.setValue(self.storeValue);
                        assertShowValue();
                    }
                });
            }
        });

        this.trigger.on(BI.SingleSelectTrigger.EVENT_CHANGE, function (value, obj) {
            self.storeValue = this.getValue();
            assertShowValue();
        });
        this.trigger.on(BI.SingleSelectTrigger.EVENT_COUNTER_CLICK, function () {
            if (!self.combo.isViewVisible()) {
                self.combo.showView();
            }
        });

        this.combo = BI.createWidget({
            type: "bi.combo",
            toggle: false,
            el: this.trigger,
            adjustLength: 1,
            popup: {
                type: "bi.single_select_popup_view",
                ref: function () {
                    self.popup = this;
                    self.trigger.setAdapter(this);
                },
                listeners: [{
                    eventName: BI.SingleSelectPopupView.EVENT_CHANGE,
                    action: function () {
                        self.storeValue = this.getValue();
                        self._adjust(function () {
                            assertShowValue();
                        });
                    }
                }, {
                    eventName: BI.SingleSelectPopupView.EVENT_CLICK_CONFIRM,
                    action: function () {
                        self._defaultState();
                    }
                }, {
                    eventName: BI.SingleSelectPopupView.EVENT_CLICK_CLEAR,
                    action: function () {
                        self.setValue();
                        self._defaultState();
                    }
                }],
                itemsCreator: o.itemsCreator,
                valueFormatter: o.valueFormatter,
                onLoaded: function () {
                    BI.nextTick(function () {
                        self.combo.adjustWidth();
                        self.combo.adjustHeight();
                        self.trigger.getSearcher().adjustView();
                    });
                }
            },
            hideChecker: function (e) {
                return triggerBtn.element.find(e.target).length === 0;
            }
        });

        this.combo.on(BI.Combo.EVENT_BEFORE_POPUPVIEW, function () {
            this.setValue(self.storeValue);
            BI.nextTick(function () {
                self.populate();
            });
        });
        // 当退出的时候如果还在处理请求，则等请求结束后再对外发确定事件
        this.wants2Quit = false;
        this.combo.on(BI.Combo.EVENT_AFTER_HIDEVIEW, function () {
            // important:关闭弹出时又可能没有退出编辑状态
            self.trigger.stopEditing();
            if (self.requesting === true) {
                self.wants2Quit = true;
            } else {
                self.fireEvent(BI.SingleSelectCombo.EVENT_CONFIRM);
            }
        });

        var triggerBtn = BI.createWidget({
            type: "bi.trigger_icon_button",
            width: o.height,
            height: o.height,
            cls: "single-select-trigger-icon-button"
        });
        triggerBtn.on(BI.TriggerIconButton.EVENT_CHANGE, function () {
            if (self.combo.isViewVisible()) {
                self.combo.hideView();
            } else {
                self.combo.showView();
            }
        });
        BI.createWidget({
            type: "bi.absolute",
            element: this,
            items: [{
                el: this.combo,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }, {
                el: triggerBtn,
                right: 0,
                top: 0,
                bottom: 0
            }]
        });
    },

    _defaultState: function () {
        this.trigger.stopEditing();
        this.combo.hideView();
    },

    _assertValue: function (val) {
        val || (val = "");
    },

    _makeMap: function (values) {
        return BI.makeObject(values || []);
    },

    _joinKeywords: function (keywords, callback) {
        var self = this, o = this.options;
        this._assertValue(this.storeValue);
        this.requesting = true;
        o.itemsCreator({
            type: BI.SingleSelectCombo.REQ_GET_ALL_DATA,
            keywords: keywords
        }, function (ob) {
            var values = BI.map(ob.items, "value");
            digest(values);
        });

        function digest (items) {
            var selectedMap = self._makeMap(items);
            BI.each(keywords, function (i, val) {
                if (BI.isNotNull(selectedMap[val])) {
                    self.storeValue.value["remove"](val);
                }
            });
            self._adjust(callback);
        }
    },

    _joinAll: function (res, callback) {
        var self = this, o = this.options;
        this._assertValue(res);
        this.requesting = true;
        o.itemsCreator({
            type: BI.SingleSelectCombo.REQ_GET_ALL_DATA,
            keywords: [this.trigger.getKey()]
        }, function (ob) {
            var items = BI.map(ob.items, "value");
            if (self.storeValue.type === res.type) {
                var change = false;
                var map = self._makeMap(self.storeValue.value);
                BI.each(items, function (i, v) {
                    if (BI.isNotNull(map[v])) {
                        change = true;
                        delete map[v];
                    }
                });
                change && (self.storeValue.value = BI.values(map));
                self._adjust(callback);
                return;
            }
            var selectedMap = self._makeMap(self.storeValue.value);
            var notSelectedMap = self._makeMap(res.value);
            var newItems = [];
            BI.each(items, function (i, item) {
                if (BI.isNotNull(selectedMap[items[i]])) {
                    delete selectedMap[items[i]];
                }
                if (BI.isNull(notSelectedMap[items[i]])) {
                    newItems.push(item);
                }
            });
            self.storeValue.value = newItems.concat(BI.values(selectedMap));
            self._adjust(callback);
        });
    },

    _adjust: function (callback) {
        var self = this, o = this.options;
        if (!this._count) {
            o.itemsCreator({
                type: BI.SingleSelectCombo.REQ_GET_DATA_LENGTH
            }, function (res) {
                self._count = res.count;
                adjust();
                callback();
            });
        } else {
            adjust();
            callback();

        }

        function adjust () {
            if (self.wants2Quit === true) {
                self.fireEvent(BI.SingleSelectCombo.EVENT_CONFIRM);
                self.wants2Quit = false;
            }
            self.requesting = false;
        }
    },

    _join: function (res, callback) {
        var self = this, o = this.options;
        this._assertValue(res);
        this._assertValue(this.storeValue);
        if (this.storeValue.type === res.type) {
            var map = this._makeMap(this.storeValue.value);
            BI.each(res.value, function (i, v) {
                if (!map[v]) {
                    self.storeValue.value.push(v);
                    map[v] = v;
                }
            });
            var change = false;
            BI.each(res.assist, function (i, v) {
                if (BI.isNotNull(map[v])) {
                    change = true;
                    delete map[v];
                }
            });
            change && (this.storeValue.value = BI.values(map));
            self._adjust(callback);
            return;
        }
        this._joinAll(res, callback);
    },

    _setStartValue: function (value) {
        this._startValue = value;
        this.popup.setStartValue(value);
    },

    setValue: function (v) {
        this.storeValue = v || "";
        this._assertValue(this.storeValue);
        this.combo.setValue(this.storeValue);
    },

    getValue: function () {
        return this.storeValue;
    },

    populate: function () {
        this._count = null;
        this.combo.populate.apply(this.combo, arguments);
    }
});

BI.extend(BI.SingleSelectCombo, {
    REQ_GET_DATA_LENGTH: 0,
    REQ_GET_ALL_DATA: -1
});

BI.SingleSelectCombo.EVENT_CONFIRM = "EVENT_CONFIRM";

BI.shortcut("bi.single_select_combo", BI.SingleSelectCombo);