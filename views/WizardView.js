define(['marionette', 'backbone', 'underscore','jquery','gauntlet'],
    function (Marionette, Backbone, _, $,Gauntlet)
    {
        "use strict";

        function getValue(target, name, context)
        {
            if (!target || !name) { return; }
            var value;

            if (target.options && target.options[name])
            {
                value = target.options[name];
            } else
            {
                value = target[name];
            }
            if (_.isFunction(value))
                value = value.apply(context, Array.prototype.slice.call(arguments,3));

            return value;
        };

        return Marionette.Layout.extend({
            template: "#wizard-layout-template",
            constructor: function(options)
            {
                Marionette.Layout.prototype.constructor.apply(this, arguments);
                
            },
            _createPageRegions: function(steps)
            {
                var self = this;
                _.each(this.steps, function (step)
                {
                    if (step.displayMode == 'hide')
                    {
                        self.regions['page-' + step.key] = '.wizard-page-' + step.key;
                    }
                });
            },
            updateSteps: function(steps)
            {

            },
            _initializeRegions: function()
            {
                this.pages.ensureEl();
                // Create div for each region 
                var self = this;
                _.each(_.keys(this.regions), function (k)
                {
                    if ( !self[k] )
                    {
                        self.pages.$el.append($("<div>",
                            {
                                "class": 'wizard-' + k

                            }));
                    }
                });
                this.initializeRegions();
                _.each(_.pick(this, 'pages', 'shared', 'header', 'actions', 'nextButton', 'finishButton', 'backButton', 'cancelButton'),
                    function (f)
                    {
                        f.ensureEl();
                    });
            },
            onRender: function()
            {
                this._createPageRegions();
                this._initializeRegions();
            },
            initialize: function(options)
            {
                _.bindAll(this);
                _.defaults(this, _.pick(options, 'steps', 'startStep', 'actionSettings'), {
                    actionSettings: {
                        showActions: true,
                        backText: 'Back',
                        nextText: 'Next',
                        cancelText: 'Cancel',
                        finishText: 'Finish',
                        canGoBack: true,
                        canFinish: true,
                        canCancel: true,
                        canGoNext: true
                    }
                });

                this._initializeGauntlet(this.steps);
                Marionette.ItemView.prototype.initialize.apply(this, arguments);
            },
            _initializeGauntlet: function(steps)
            {
                steps = steps || this.steps;
                this.gauntlet = new Gauntlet({ workflowSteps: steps });
                this.gauntlet.beforeMove(this._beforeStepChange);
                this.gauntlet.afterMove(this._afterStepChange);
            },
            availableActions: function(oldStep, newStep)
            {

                var showNext = !newStep.isLast && !newStep.isEmpty;
                if (showNext)
                    showNext = getValue(this.actionSettings, 'canGoNext', this, oldStep, newStep);
                if (!_.isBoolean(showNext))
                    showNext = true;
                
                var showBack = (newStep && !newStep.isFirst) || false;
                if (showBack && newStep)
                {
                    showBack = getValue(newStep, 'canGoBack', this, oldStep, newStep);
                }
                if (showBack)
                    showBack = getValue(this.actionSettings, 'canGoBack', this, oldStep, newStep);
                if (!_.isBoolean(showBack))
                    showBack = true;

                var showFinish = (newStep && newStep.isLast) || false;
                if (showFinish)
                    showFinish = getValue(this.actionSettings, 'canFinish', this, oldStep, newStep);
                if (!_.isBoolean(showFinish))
                    showFinish = true;

                var showCancel = !showFinish;
                if (showCancel)
                    showCancel = getValue(this.actionSettings, 'canCancel', this, oldStep, newStep);
                if (!_.isBoolean(showCancel))
                    showCancel = true;
                
                return {
                    next: showNext,
                    back: showBack,
                    finish: showFinish,
                    cancel: showCancel
                }

            },

            updateActions: function(oldStep, newStep)
            {
                var showActions = getValue(this.actionSettings, 'show_actions', this, oldStep, newStep);
                if (!_.isBoolean(showActions))
                    showActions = true;
                this.actions.$el.css('display', showActions ? 'block' : 'none');

                var actions = this.availableActions(oldStep, newStep);

                this.backButton.$el.css('display', actions.back ? 'inline-block' : 'none').html(getValue(this.actionSettings, 'backText', this, oldStep, newStep));
                this.nextButton.$el.css('display', actions.next ? 'inline-block' : 'none').html(getValue(this.actionSettings, 'nextText', this, oldStep, newStep));
                this.finishButton.$el.css('display', actions.finish ? 'inline-block' : 'none').html(getValue(this.actionSettings, 'finishText', this, oldStep, newStep));
                this.cancelButton.$el.css('display', actions.cancel ? 'inline-block' : 'none').html(getValue(this.actionSettings, 'cancelText', this, oldStep, newStep));

            },
            _beforeStepChange: function(oldStep, newStep, done)
            {
                if (_.isObject(oldStep) && _.isFunction(oldStep.onExit))
                    oldStep.onExit.call(this, newStep, onExitCallback);
                else
                    onExitCallback(true);

                function onExitCallback(result)
                {
                    if (_.isBoolean(result) || _.isNull(result) || _.isUndefined(result) )
                        done(result || true);
                    else if (_.isString(result)) // change to another step
                    {
                        this.gauntlet.moveToByKey(result);
                    }
                }
            },
            _afterStepChange: function(oldStep, newStep, done)
            {
                if (_.isObject(newStep) && _.isFunction(newStep.onEnter))
                    newStep.onEnter.call(this, oldStep);
                this._showPage(oldStep, newStep);
                
            },
            _showPage: function(oldStep,newStep)
            {
                var self = this;
                var currentRegion = oldStep && (oldStep.displayMode != 'hide' ? this.shared : this['page-' + oldStep.key]);
                var newRegion = newStep.displayMode != 'hide' ? this.shared : this['page-' + newStep.key];
                getValue(newStep, 'view', this, oldStep, newStep, function (view)
                {
                    if ((newStep.displayMode == 'hide' && !newRegion.currentView) || newStep.displayMode != 'hide')
                        newRegion.show(view);
                    if (currentRegion && currentRegion.$el && currentRegion != newRegion)
                        currentRegion.$el.css('display', 'none');
                    newRegion.$el.css('display', 'block');
                    self.updateActions(oldStep, newStep);
                });

            },
            events: {
                'click button.wizard-next': 'nextStep',
                'click button.wizard-back': 'previousStep',
                'click button.wizard-cancel': 'cancel',
                'click button.wizard-finish': 'finish'
            },
            regions: {
                shared: '.wizard-shared-page', // Used by pages that are not flagged to hide e.g. are recreated on each view
                header: '.wizard-header',
                actions: '.wizard-actions',
                pages: '.wizard-pages',
                nextButton: 'button.wizard-next',
                backButton: 'button.wizard-back',
                finishButton: 'button.wizard-finish',
                cancelButton: 'button.wizard-cancel'
            },
            onShow: function ()
            {
                this.gauntlet.moveToByKey(this.startStep || this.steps[0].key);
            },
            currentStep: function()
            {
                return this.gauntlet.getCurrentStep;
            },
            nextStep: function ()
            {
                var next = this.gauntlet.getNextStep();
                this.gauntlet.nextStep();
            },
            previousStep: function ()
            {
                var prev = this.gauntlet.getNextStep();
                this.gauntlet.previousStep();
            },
            cancel: function ()
            {
            },
            finish: function ()
            {
            },
            onClose: function ()
            {
                var self = this;
                _.each(this.steps, function (step)
                {
                    if (step.displayMode == 'hide')
                    {
                        delete self.regions['page-' + step.key];
                    }
                });

            }
        });

    });
