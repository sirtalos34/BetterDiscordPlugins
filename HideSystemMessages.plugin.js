/**
 * @name HideSystemMessages
 * @authorId 433027692372426753
 * @website https://github.com/sirtalos34/BetterDiscordPlugins/blob/main/HideSystemMessages.plugin.js
 * @source https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/HideSystemMessages.plugin.js
 */

module.exports = (() =>
{
    const config =
	{
		info:
		{
			name: 'HideSystemMessages',
			authors: [{
				name: 'Keifu',
				discord_id: '433027692372426753',
				github_username: 'sirtalos34'
			}],
			version: '1.0.1',
			description: 'Adds the ability to hide system messages',
			github: 'https://github.com/sirtalos34/BetterDiscordPlugins/blob/main/HideSystemMessages.plugin.js',
			github_raw: 'https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/HideSystemMessages.plugin.js'
		}
	};

	return !global.ZeresPluginLibrary ? class
	{
		constructor() { this._config = config; }

		getName = () => config.info.name;
		getAuthor = () => config.info.description;
		getVersion = () => config.info.version;

		load()
		{
			BdApi.showConfirmationModal('Library Missing', `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
				confirmText: 'Download Now',
				cancelText: 'Cancel',
				onConfirm: () =>
				{
					require('request').get('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', async (err, res, body) =>
					{
						if (err) return require('electron').shell.openExternal('https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js');
						await new Promise(r => require('fs').writeFile(require('path').join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js'), body, r));
					});
				}
			});
		}

		start() { }
		stop() { }
	} : (([Plugin, Api]) => {

		const plugin = (Plugin, Api) =>
		{
			return class HideSystemMessages extends Plugin 
			{
				constructor() {
					super();
					this.save = (m, e) => typeof this.settings[m] !== 'undefined' ? this.settings[m] = e : null;
					this.defaultSettings = {
						hiddenMessages: {},
						hiddenChannels: {}, /* Todo: Add ability to hide all system messages in certain channels */
						hideAll: false
					};
				}

				onStart()
				{
					/* Wait for user to be logged in */
					const interval = setInterval(() => {
						if(Api.DiscordAPI.currentUser === null) return;
						clearInterval(interval);
						this.onLogin();
					}, 500);
				}

				async onLogin()
                {
					this.patches = [];
					this.patches.push(Api.Patcher.before(BdApi.findModuleByProps('logMessageChanges'), 'default', (_, [obj]) => {
						const isHidden = (e) =>
						{	if(e.type === 3 && this.settings.hideAll) return true;
							if(e.type === 3 && this.settings.hiddenMessages[e.channel_id]
							&& this.settings.hiddenMessages[e.channel_id].includes(e.id)) return true;
							return false;
						}
						obj.messages._array = obj.messages._array.filter(e => !isHidden(e));
					}));

					const SystemMessageContextMenu = Api.WebpackModules.find(m => m.default && m.default.displayName === 'SystemMessageContextMenu');
					this.patches.push(Api.Patcher.after(SystemMessageContextMenu, 'default', (_, [props], returnValue) => {
						if(props.message.type !== 3) return;
						const original = returnValue.props.children[2].props.children;
						const newMenu = Api.DCM.buildMenuItem({
							label: 'Hide Message',
							danger: true,
							action: () => {
								this.onHide(props.channel.id, props.message.id);
							}
						});

						if(props.message.author.id === Api.DiscordAPI.currentUser.id)
						{
							if(Array.isArray(original)) original.splice(2, 1, newMenu);
							else returnValue.props.children[2].props.children[2] = newMenu;
						}
						else
						{
							if(Array.isArray(original)) original.splice(4, 0, newMenu);
							else returnValue.props.children[2].props.children = [original, newMenu];
						}
					}));
					this.reloadAllMessages();
				}

				onStop()
				{
					this.patches.forEach(unpatch => unpatch());
				}

				onHide(channel, message)
				{
					if(typeof this.settings.hiddenMessages[channel] !== 'object') /* Dont ever put a semicolon here again */
						this.settings.hiddenMessages[channel] = [];
					this.settings.hiddenMessages[channel].push(message);
					this.reloadMessage(message);
					this.saveSettings();
				}

				reloadMessage(msg)
				{
					if(typeof msg === 'string')
					{
						const messages = BdApi.findModuleByProps('getMessages').getMessages(BdApi.findModuleByProps('getChannelId').getChannelId())._array;
						msg = messages.filter(e => e.id === msg)[0];
					}
					if(msg === undefined) return;
					const FluxDispatcher = BdApi.findModuleByProps('dirtyDispatch');
					FluxDispatcher.dirtyDispatch({
						...{},
						type: 'MESSAGE_UPDATE',
						message: msg
					});
				}

				reloadAllMessages()
				{
					for(const channel in this.settings.hiddenMessages)
					{
						this.settings.hiddenMessages[channel].forEach(msg => this.reloadMessage(msg));
					}
					if(!this.settings.hideAll) return;
					const messages = BdApi.findModuleByProps('getMessages').getMessages(BdApi.findModuleByProps('getChannelId').getChannelId())._array.filter(e => e.type === 3);
					messages.forEach(msg => {
						this.reloadMessage(msg);
					});
				}

				getSettingsPanel()
				{
					const { Settings } = Api;
					const set = {
						generalSettings: {
							name: 'General',
							shown: true,
							settings: {
								hideAll: { type: 'Switch', name: 'Hide all', tooltip: 'Hide all system messages in every channel', exec: () => { this.reloadAllMessages(); } }
							}
						}
					}

					return Settings.SettingPanel.build(this.saveSettings.bind(this),
						...Object.values(set).map(group => {
							return new Settings.SettingGroup(group.name, { shown: group.shown || false }).append(
								...Object.keys(group.settings).map(name => {
									const i = group.settings[name];
									let obj;
									const exec = (e) => { this.save(name, e); i.exec(); };
									switch(i.type) {
										case 'Switch':
											obj = new Settings.Switch(i.name, null, this.settings[name], exec, i.options || {});
											break;
										case 'Slider':
											obj = new Settings.Slider(i.name, null, i.min, i.max, this.settings[name], exec, i.options || {});
											break;
										case 'Textbox':
											obj = new Settings.Textbox(i.name, null, this.settings[name], exec, i.options || {});
											break;
									}
									if(i.tooltip !== null) new Api.EmulatedTooltip(obj.inputWrapper, i.tooltip, { side: 'left' });
									return obj;
								})
							);
						})
					);
				}
			};
		}

		return plugin(Plugin, Api);
	})(global.ZeresPluginLibrary.buildPlugin(config));
})();