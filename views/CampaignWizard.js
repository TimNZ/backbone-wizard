define(['marionette', 'backbone', 'vent', 'App', 'layouts/ClientBreadcrumbLayout', 'views/WizardView', 'views/LocationListPagerView'],
    function (Marionette, Backbone, Vent, app, BreadcrumbLayout, WizardView, ListPager)
    {
        "use strict";


        return BreadcrumbLayout.extend({
            template: "#campaign-edit-layout-template",
            initialize: function(options)
            {
                _.bindAll(this);
                BreadcrumbLayout.prototype.initialize.call(this, options);
                this.views = {};
                this._createWizardOptions();
                this._createPageModels();
            },
            /* Create a separate model for each page, they will be merged on page changes */
            _createPageModels: function()
            {
                this.pageModels = {};
                var self = this;
                _.each(this.wizardOptions.steps, function (step)
                {
                    self.pageModels[step.key] = self.model.clone();
                });
            },
            _mergeModels: function()
            {
                var self = this;
                _.each(this.pageModels, function (modelA)
                {
                    self.model.set(modelA.attributes);
                    _.each(self.pageModels, function (modelB)
                    {
                        if (modelB != modelA)
                        {
                            modelA.set(modelB.attributes);
                        }
                    });
                })
            },
            regions: {
                wizard: '.wizard'
            },
            onShow: function ()
            {
                this._createWizardOptions();
                this.wizard.show(new WizardView(this.wizardOptions));
            },
            _createWizardOptions: function()
            {
                var self = this;
                var Step = function (options)
                {
                    _.extend(this, {
                        key: null, displayMode: 'hide',
                        viewPath: null,
                        view: function (oldStep, newStep, done)
                        {
                            var thisStep = this;
                            if (this.displayMode == 'hide' && self.views[thisStep.key])
                                return done(self.views[thisStep.key]);

                            require([this.viewPath], function (View)
                            {
                                var view = self.views[thisStep.key] = new View({ model: self.pageModels[thisStep.key] });
                                done(view);
                            });
                        },
                        onEnter: function (oldStep)
                        {
                            if (oldStep)
                            {
                                self.views[oldStep.key].$el.find('.error-block').html('');
                            }
                        },
                        onExit: function (newStep, done)
                        {
                            if (newStep.position >= this.position)
                            {
                                if (!self.views[this.key].validate())
                                {
                                    self.views[this.key].commit();
                                    self._mergeModels();
                                    done(true);
                                }
                            }
                            else
                                done(true);
                        }
                    }, options);
                    _.bindAll(this);
                }

                this.wizardOptions = {
                    steps: [
                        new Step({ key: 'campaign', position: 1,viewPath: 'views/CampaignEdit/Campaign', isFirst: true}),
                        new Step({ key: 'picktemplate', position: 2, viewPath: 'views/CampaignEdit/PickTemplate' }),
                        new Step({ key: 'editcontent', position: 3, viewPath: 'views/CampaignEdit/EditContent'}),
                        new Step({ key: 'review', position: 4, viewPath: 'views/CampaignEdit/Review'}),
                        new Step({ key: 'launch', position: 5, viewPath: 'views/CampaignEdit/Launch', isLast: true }),
                    ],
                    startStep: 'campaign'
                }
            },
            // Return true or false to indicate if this view can be closed
            close: function (callback)
            {
                BreadcrumbLayout.prototype.close.call(this);
                callback(true);
            }
        });

    });
