/**
 * @name BlurScreensharesOnMute
 * @authorId 433027692372426753
 * @website https://github.com/sirtalos34/BetterDiscordPlugins/blob/main/BlurScreensharesOnMute.plugin.js
 * @source https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/BlurScreensharesOnMute.plugin.js
 */

module.exports = (() =>
{
	const config =
	{
		info:
		{
			name: 'BlurScreensharesOnMute',
			authors: [{
				name: 'Keifu',
				discord_id: '433027692372426753',
				github_username: 'sirtalos34'
			}],
			version: '1.0.6',
			description: 'Blurs all sceenshares and cameras when you mute yourself',
			github: 'https://github.com/sirtalos34/BetterDiscordPlugins/blob/main/BlurScreensharesOnMute.plugin.js',
			github_raw: 'https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/BlurScreensharesOnMute.plugin.js'
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
			return class BlurScreensharesOnMute extends Plugin
			{
				constructor()
				{
					super();
					this.save = (m, e) => typeof this.settings[m] !== 'undefined' ? this.settings[m] = e : null;
					this.defaultSettings = { blur: 35 };
				}

				onStart()
				{
					/* Wait for user to be logged in */
					const interval = setInterval(() =>
					{
						if(Api.DiscordAPI.currentUser === null) return;
						clearInterval(interval);
						this.onLogin();
					}, 500);
				}

				async onLogin()
				{
					const muteButton = document.querySelector('*[aria-label="Mute"]');
					this.muteObserver = new MutationObserver(m =>
					{
						if(m[0].attributeName !== 'aria-checked') return;
						const muted = (m[0].target.attributes['aria-checked'].nodeValue == 'true');
						const css = `[class*="videoWrapper"], [class*="pictureInPictureWindow"] { filter: blur(${this.settings.blur}px) }`;
						muted ? Api.PluginUtilities.addStyle(config.info.name, css) : Api.PluginUtilities.removeStyle(config.info.name);
					});
					this.muteObserver.observe(muteButton, { attributes: true });
				}

				onStop()
				{
					if(this.muteObserver) this.muteObserver.disconnect();
					Api.PluginUtilities.removeStyle(config.info.name);
				}

				getSettingsPanel()
				{
					const { Settings } = Api;
					const set = {
						generalSettings: {
							name: 'General',
							shown: true,
							settings: {
								blur: { type: 'Slider', min: 1, max: 100, name: 'Blur Strength', tooltip: null, exec: () => {} }
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