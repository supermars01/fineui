/**
 * 下拉框弹出层, zIndex在1000w
 * @class BI.PopupView
 * @extends BI.Widget
 */
BI.PopupView = BI.inherit(BI.Widget, {
    _defaultConfig: function () {
        return BI.extend(BI.PopupView.superclass._defaultConfig.apply(this, arguments), {
            _baseCls: "bi-popup-view",
            maxWidth: "auto",
            minWidth: 100,
            // maxHeight: 200,
            minHeight: 24,
            lgap: 0,
            rgap: 0,
            tgap: 0,
            bgap: 0,
            vgap: 0,
            hgap: 0,
            innerVGap: 0,
            direction: BI.Direction.Top, // 工具栏的方向
            stopEvent: false, // 是否停止mousedown、mouseup事件
            stopPropagation: false, // 是否停止mousedown、mouseup向上冒泡
            logic: {
                dynamic: true
            },

            tool: false, // 自定义工具栏
            tabs: [], // 导航栏
            buttons: [], // toolbar栏

            el: {
                type: "bi.button_group",
                items: [],
                chooseType: 0,
                behaviors: {},
                layouts: [{
                    type: "bi.vertical"
                }]
            }
        });
    },

    _init: function () {
        BI.PopupView.superclass._init.apply(this, arguments);
        var self = this, o = this.options;
        var fn = function (e) {
                e.stopPropagation();
            }, stop = function (e) {
                e.stopEvent();
                return false;
            };
        this.element.css({
            "z-index": BI.zIndex_popup,
            "min-width": o.minWidth + "px",
            "max-width": o.maxWidth + "px"
        }).bind({click: fn});

        this.element.bind("mousewheel", fn);

        o.stopPropagation && this.element.bind({mousedown: fn, mouseup: fn, mouseover: fn});
        o.stopEvent && this.element.bind({mousedown: stop, mouseup: stop, mouseover: stop});
        this.tool = this._createTool();
        this.tab = this._createTab();
        this.view = this._createView();
        this.toolbar = this._createToolBar();

        this.view.on(BI.Controller.EVENT_CHANGE, function (type) {
            self.fireEvent(BI.Controller.EVENT_CHANGE, arguments);
            if (type === BI.Events.CLICK) {
                self.fireEvent(BI.PopupView.EVENT_CHANGE);
            }
        });

        BI.createWidget(BI.extend({
            element: this
        }, BI.LogicFactory.createLogic(BI.LogicFactory.createLogicTypeByDirection(o.direction), BI.extend({}, o.logic, {
            scrolly: false,
            lgap: o.lgap,
            rgap: o.rgap,
            tgap: o.tgap,
            bgap: o.bgap,
            vgap: o.vgap,
            hgap: o.hgap,
            items: BI.LogicFactory.createLogicItemsByDirection(o.direction,
                BI.extend({
                    cls: "list-view-outer bi-card list-view-shadow"
                }, BI.LogicFactory.createLogic(BI.LogicFactory.createLogicTypeByDirection(o.direction), BI.extend({}, o.logic, {
                    items: BI.LogicFactory.createLogicItemsByDirection(o.direction, this.tool, this.tab, this.view, this.toolbar)
                })))
            )
        }))));
    },

    _createView: function () {
        var o = this.options;
        this.button_group = BI.createWidget(o.el, {type: "bi.button_group", value: o.value});
        this.button_group.element.css({"min-height": o.minHeight + "px", "padding-top": o.innerVGap + "px", "padding-bottom": o.innerVGap + "px"});
        return this.button_group;
    },

    _createTool: function () {
        var o = this.options;
        if (false === o.tool) {
            return;
        }
        return BI.createWidget(o.tool);
    },

    _createTab: function () {
        var o = this.options;
        if (o.tabs.length === 0) {
            return;
        }
        return BI.createWidget({
            type: "bi.center",
            cls: "list-view-tab",
            height: 25,
            items: o.tabs,
            value: o.value
        });
    },

    _createToolBar: function () {
        var o = this.options;
        if (o.buttons.length === 0) {
            return;
        }

        return BI.createWidget({
            type: "bi.center",
            cls: "list-view-toolbar bi-high-light bi-split-top",
            height: 24,
            items: BI.createItems(o.buttons, {
                once: false,
                shadow: true,
                isShadowShowingOnSelected: true
            })
        });
    },

    getView: function () {
        return this.view;
    },

    populate: function (items) {
        this.view.populate.apply(this.view, arguments);
    },

    resetWidth: function (w) {
        this.options.width = w;
        this.element.width(w);
    },

    resetHeight: function (h) {
        var tbHeight = this.toolbar ? (this.toolbar.attr("height") || 24) : 0,
            tabHeight = this.tab ? (this.tab.attr("height") || 24) : 0,
            toolHeight = ((this.tool && this.tool.attr("height")) || 24) * ((this.tool && this.tool.isVisible()) ? 1 : 0);
        var resetHeight = h - tbHeight - tabHeight - toolHeight - 2 * this.options.innerVGap;
        this.view.resetHeight ? this.view.resetHeight(resetHeight) :
            this.view.element.css({"max-height": resetHeight + "px"});
    },

    setValue: function (selectedValues) {
        this.tab && this.tab.setValue(selectedValues);
        this.view.setValue(selectedValues);
    },

    getValue: function () {
        return this.view.getValue();
    }
});
BI.PopupView.EVENT_CHANGE = "EVENT_CHANGE";
BI.shortcut("bi.popup_view", BI.PopupView);