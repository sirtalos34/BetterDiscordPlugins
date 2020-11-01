/**
 * @name TypingSounds
 * @authorId 433027692372426753
 * @website https://github.com/sirtalos34/BetterDiscordPlugins/TypingSounds.plugin.js
 * @source https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/TypingSounds.plugin.js
 */

module.exports = (() =>
{
    const config =
	{
		info:
		{
			name: 'TypingSounds',
            authors: [{
				name: 'Keifu',
				discord_id: '433027692372426753',
				github_username: 'sirtalos34'
			}],
			version: '1.0.1',
			description: 'Add sounds that play when you type!',
			github: 'https://github.com/sirtalos34/BetterDiscordPlugins/TypingSounds.plugin.js',
			github_raw: 'https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/TypingSounds.plugin.js'
        },
        changelog: [{
            'title': 'README',
            'items': [ 'To add your own typing sounds:\nMove any type of audio file into plugins/typingSounds', 'Multiple audio files are also supported' ]
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
			return class TypingSounds extends Plugin 
			{
				constructor() {
                    super();
                    this.save = (m, e) => typeof this.settings[m] !== 'undefined' ? this.settings[m] = e : null;
					this.defaultSettings = {
                        volume: 1
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
                    const path = BdApi.Plugins.folder + '/typingSounds';
                    const fs = require('fs');
                    if(!fs.existsSync(path)) fs.mkdirSync(path);
                    const typingSounds = [];
                    const files = fs.readdirSync(path);
                    files.forEach(file => {
                        const base64 = fs.readFileSync(path + '/' + file, { encoding: 'base64' });
                        const audio = new Audio();
                        audio.src = 'data:audio/mpeg;base64,' + base64;
                        typingSounds.push(audio);
                    });
                    if(typingSounds.length === 0) for(let i = 1; i < 6; i++) { typingSounds.push(new Audio(`https://raw.githubusercontent.com/sirtalos34/BetterDiscordPlugins/main/typingSounds/key-press-${i}.wav`)); };
                    document.onkeydown = () => {
                        const audio = typingSounds[Math.floor(Math.random() * typingSounds.length)];
                        audio.volume = this.settings.volume / 10;
                        audio.play().catch(() => {});
                    };
				}

				onStop()
				{
					document.onkeydown = null;
				}

				getSettingsPanel()
                {
                    const { Settings } = Api;
                    const set = {
                        generalSettings: {
                            name: 'General',
                            shown: true,
                            settings: {
                                help: { type: 'Switch', name: 'Click me for help', tooltip: null, exec: () => { BdApi.showConfirmationModal('README', 'To add your own typing sounds:\nMove any type of audio file into \'plugins/typingSounds\'.\nIf there are multiple audio files in the directory it will randomly select which to play'); } },
                                volume: { type: 'Slider', min: 1, max: 9, name: 'Volume', tooltip: null, exec: e => {}, options: { markers: Array.from({ length: 9 }, (_, i) => i + 1), stickToMarkers: true } }
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