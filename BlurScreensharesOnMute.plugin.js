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
			version: '1.0.7',
			description: 'Blurs all sceenshares and cameras when you mute yourself',
			github: 'https://github.com/sirtalos34/BetterDiscordPlugins/blob/main/BlurScreensharesOnMute.plugin.js',
			github_raw: 'https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/BlurScreensharesOnMute.plugin.js'
		},
		changelog: [{
			'title': 'Added Keybind',
			'items': [ 'You can now configure a keybind to toggle the blur' ]
		}]
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
					this.defaultSettings = { blurKeybind: [], blurOnMute: true, blur: 35 };
					this.globalShortcut = require('electron').remote.globalShortcut;
					this._settings = {
						generalSettings: {
							name: 'General',
							collapsible: false,
							shown: true,
							settings: {
								blurKeybind: { type: 'Keybind', name: 'Keybind', exec: e => this.setupKeybind(e)  },
								blurOnMute: { type: 'Switch', name: 'Activate on mute', exec: e => this.createMutationObserver() },
								blur: { type: 'Slider', min: 1, max: 100, name: 'Blur Strength' }
							}
						}
					}
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
					this.setupKeybind(this.settings.blurKeybind);
					if(this.settings.blurOnMute) this.createMutationObserver();
				}

				onStop()
				{
					try { this.globalShortcut.unregister(this.keycode); } catch(e) { Api.Logger.err('Failed to unregister global shortcut'); }
					document.body.removeEventListener('keydown', this.listener, true);
					if(this.MutationObserver) this.MutationObserver.disconnect();
					Api.PluginUtilities.removeStyle(config.info.name);
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

				setupKeybind(keyCodes)
				{
					if(keyCodes.length === 0) return;
					if(!keyCodes.includes(160) && !keyCodes.includes(162) && !keyCodes.includes(164))
					{
						this.settings.blurKeybind = [];
						return Api.Toasts.error('Keybind must at least include one of the following: CTRL, SHIFT, ALT.');
					}
					if(keyCodes.filter(e => ![160, 162, 164].includes(e)).length === 0)
					{
						this.settings.blurKeybind = [];
						return Api.Toasts.error('Keybind must include at least one key from A-Z, 0-9.');
					}
					if(keyCodes.length === 1)
					{
						this.settings.blurKeybind = [];
						return Api.Toasts.error('Keybind must include at least two keys. Example: Ctrl+B');
					}

					if(this.keycode) try { this.globalShortcut.unregister(this.keycode); } catch(e) { Api.Logger.err('Failed to unregister global shortcut'); }
					document.body.removeEventListener('keydown', this.listener, true);
					const keys = [];
					keyCodes.forEach(code => {
						if(code === 162) return keys.push('CommandOrControl');
						if(code === 160) return keys.push('Shift');
						if(code === 164) return keys.push('Alt');
						keys.push(String.fromCharCode(code));
					});
					this.keycode = keys.join('+');
					let shortcut = false;
					try { shortcut = this.globalShortcut.register(this.keycode, this.toggleBlur.bind(this)); } catch(e) { Api.Logger.err('Failed to register global shortcut'); }
					if(shortcut) return;
					this.listener = this.onKeyDown.bind(this);
					document.body.addEventListener('keydown', this.listener, true);
					Api.Logger.warn('Unable to register global shortcut. Registering local shortcut instead');
				}

				createMutationObserver()
				{
					const muteButton = document.querySelector('[aria-label="Mute"]');
					this.MutationObserver = new MutationObserver(m =>
					{
						if(m[0].attributeName !== 'aria-checked') return;
						const muted = (m[0].target.attributes['aria-checked'].nodeValue == 'true');
						this.toggleBlur(muted);
					});
					this.MutationObserver.observe(muteButton, { attributes: true });
				}

				toggleBlur(state)
				{
					const injected = document.getElementById(config.info.name) !== null;
					if(injected === state) return; if(typeof state !== 'boolean') state = !injected;
					const css = `[class*="videoWrapper"], [class*="pictureInPictureWindow"] { filter: blur(${this.settings.blur}px) }`;
					state ? Api.PluginUtilities.addStyle(config.info.name, css) : Api.PluginUtilities.removeStyle(config.info.name);
				}

				onKeyDown(e)
				{
					const codes = this.settings.blurKeybind;
					if(codes.includes(162) && !e.ctrlKey) return;
					if(codes.includes(160) && !e.shiftKey) return;
					if(codes.includes(164) && !e.altKey) return;
					if(codes[codes.length - 1] !== e.keyCode) return;
					this.toggleBlur();
				}
			};
		}

		return plugin(Plugin, Api);
	})(global.ZeresPluginLibrary.buildPlugin(config));
})();