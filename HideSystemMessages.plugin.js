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
			version: '1.0.2',
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
					this.defaultSettings = { hideAll: false };
					this._settings = {
						generalSettings: {
							name: 'General',
							collapsible: false,
							shown: true,
							settings: {
								hideAll: { type: 'Switch', name: 'Hide all', tooltip: 'Hide all system messages in every channel', exec: e => { this.updateAllMessages(); } }
							}
						}
					}
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
					this.hiddenMessages = Api.PluginUtilities.loadData(config.info.name, 'hiddenMessages');
					this.patches = [];
					this.patches.push(Api.Patcher.before(BdApi.findModuleByProps('logMessageChanges'), 'default', (_, [obj]) => {
						const isHidden = (e) =>
						{	if(e.type === 3 && this.settings.hideAll) return true;
							if(e.type === 3 && this.hiddenMessages[e.channel_id]
							&& this.hiddenMessages[e.channel_id].includes(e.id)) return true;
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
							action: () => { this.onHide(props.channel.id, props.message.id); }
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
					this.updateAllMessages();
				}

				onStop()
				{
					this.patches.forEach(unpatch => unpatch());
				}

				onHide(channel, message)
				{
					if(typeof this.hiddenMessages[channel] !== 'object') /* Dont ever put a semicolon here again */
						this.hiddenMessages[channel] = [];
					this.hiddenMessages[channel].push(message);
					this.updateMessage(message);
					Api.PluginUtilities.saveData(config.info.name, 'hiddenMessages', this.hiddenMessages);
				}

				updateMessage(msg)
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

				updateAllMessages()
				{
					for(const channel in this.hiddenMessages)
					{
						this.hiddenMessages[channel].forEach(msg => this.updateMessage(msg));
					}
					if(!this.settings.hideAll) return;
					const messages = BdApi.findModuleByProps('getMessages').getMessages(BdApi.findModuleByProps('getChannelId').getChannelId())._array.filter(e => e.type === 3);
					messages.forEach(msg => {
						this.updateMessage(msg);
					});
				}

				getSettingsPanel()
				{
					const { Settings } = Api;
					return Settings.SettingPanel.build(this.saveSettings.bind(this),
						...Object.values(this._settings).map(group => {
							const options = { collapsible: group.collapsible, shown: group.shown };
							return new Settings.SettingGroup(group.name, options).append(
								...Object.keys(group.settings).map(name => {
									const i = group.settings[name];
									const exec = (e) => { this.save(name, e); typeof i.exec === 'function' ? i.exec(e) : null; };
									const args = [i.name, i.note, i.value || this.settings[name], exec, i.options || {}];
									switch(i.type) {
										case 'Dropdown': case 'RadioGroup':
											args.splice(3, 0, i.values); break;
										case 'Slider':
											args.splice(2, 0, i.min); args.splice(3, 0, i.max); break;
										case 'FilePicker':
											args.splice(2, 1); break;
									}
									const obj = new Settings[i.type](...args);
									if(typeof i.tooltip === 'string') new Api.EmulatedTooltip(obj.inputWrapper, i.tooltip, { side: 'left' });
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