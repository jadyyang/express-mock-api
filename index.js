/**
 * index.js
 * Created by jady on 2016/8/12.
 */

var fs = require("fs");
var watch = require("node-watch");
var pathutil = require("path");
var path2reg = require("path-to-regexp");

function Mock() {
    return this._init.apply(this, Array.prototype.slice.call(arguments));
}

Mock.prototype = {

    constructor: Mock,

    _init: function(options) {
        this._options = options;
        this._path2RegMap = {};
        var root = options.root;

        // 从默认路径获取配置文件
        var configPath = pathutil.resolve(root + "/mock.config.js");
        this._reloadConfig(configPath);

        // 如果需要热替换，那就跟踪配置文件的变化
        if (this._config.hot) {
            var _this = this;
            // 注意：这里只能跟踪文件夹，不能只跟踪文件
            var watcher = watch(root, function(filename) {
                if (filename !== configPath) return;
                delete require.cache[configPath];

                _this._path2RegMap = {};
                _this._reloadConfig(configPath);
            });
            watcher.on("error", function(filename) {
                console.error(`Error on Watch(Mock):`, filename);
            });
        }
    },

    deal: function(req, res, next) {
        var pathname = req.path || "/";

        // 如果配置文件中设置为忽略，那就忽略之
        var pathConfig = this._configOfPath(pathname);
        if ((typeof pathConfig == "boolean" && pathConfig === false)
            || (typeof pathConfig == "object" && pathConfig != null && pathConfig.ignore === true)) {
            // 明确表示不处理
            return next();
        }

        // 如果配置信息就是一个方法，那就交给其来处理
        if (typeof pathConfig == "function") {
            return pathConfig(req, res, next);
        }

        // 下面就是自动在路径下寻找匹配文件

        // 获得所有可能的路径信息，找到第一个存在的文件
        var paths = this._getPaths(pathname);
        for (var path of paths) {
            if (isExist(path)) {
                // 如果是js文件，那就读取这个js文件，然后调用之
                if (path.length > 3 && path.substr(path.length - 3).toLowerCase() === ".js") {
                    var mod = require(path);
                    if (typeof mod === "function") {
                        return mod(req, res, next);
                    }

                    // 如果是热替换，那就直接删除这个缓存
                    if (this._config.hot) {
                        delete require.cache[path];
                    }
                }

                res.sendFile(path);
                return;
            }
        }

        next();
    },

    /**
     * 获得配置信息
     * @returns {{}}
     * @private
     */
    _reloadConfig: function(configPath) {
        var config = {};
        if (isExist(configPath)) {
            config = require(configPath);
        }
        this._config = config;
    },

    /**
     * 获得该路径的配置信息
     * @param pathname
     * @private
     */
    _configOfPath: function(pathname) {
        // 如果在路径配置中显示忽略这个路径，那就直接忽略之
        var ignore = this._options.ignore;
        if (ignore) {
            if (pathname.indexOf(ignore) == 0) {
                return false;
            }
        }

        // 如果不存在配置信息，那就直接返回
        var pathsConfig = this._config.paths;
        if (!pathsConfig) return null;

        var path2RegMap = this._path2RegMap;
        for (var path in pathsConfig) {
            var reg = path2RegMap[path] || (path2RegMap[path] = path2reg(path, []));
            if (reg.test(pathname)) {
                return pathsConfig[path];
            }
        }

        return null;
    },

    /**
     * 获得可能的路径名
     * @param pathname
     * @returns {Array}
     * @private
     */
    _getPaths: function(pathname) {
        var prefix = this._options.root + pathname;
        var paths;
        if (pathname.charAt(pathname.length - 1) === "/") {
            // pathname是个路径，比如： /path/name/
            paths = [   prefix + "index.js",
                prefix + "index.json",
                prefix + "index.html"
            ];
        } else {
            var result = ExtReg.exec(pathname);
            if (result && result[1]) {
                // pathname有后缀，比如：/path/to/filename.do

                var ext = result[1].toLowerCase();
                if (ext != "js") {
                    paths = [   prefix + ".js",
                        prefix + ".json",
                        prefix + ".html"
                    ];
                }
                paths.push(prefix);
            } else {
                // pathname没有后缀，比如：/path/name
                paths = [   prefix + ".js",
                    prefix + ".json",
                    prefix + ".html",
                    prefix + "/index.js",
                    prefix + "/index.json",
                    prefix + "/index.html"
                ];
            }
        }

        return paths;
    }

};

// 获取后缀的正则表达式
var ExtReg = /\.(\w+)$/;

/**
 * 判断某个文件是否存在
 * @param filename
 * @returns {boolean}
 */
function isExist(filename) {
    try {
        fs.accessSync(filename, fs.R_OK);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = function(options) {
    var instance = new Mock(options);
    return instance.deal.bind(instance);
};