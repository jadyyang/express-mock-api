# express-mock-api
简单、强大的mock请求的express插件

## 关键词注明

本插件中有几个关键词需要注意，同时也为了避免混淆
* 初始化配置：也就是插件初始化时的配置，详见《初始化配置》
* mock配置文件：关于mock url的配置信息，详见《mock配置文件》
* mock文件夹：所有mock的文件以及配置文件所在的文件夹，详见《最佳实践》


## 初始化配置

初始化时需要传入两个信息：
* root：必填项，指定*mock文件夹*的地址
* ignore：{String}类型，可选项。代表需要忽略的请求路径，采用前缀比较的模式（暂时不支持正则）。
    * 常见用来忽略资源类和普通页面的请求
    * 这一项主要是为了提高性能，因此不是必须的

### 初始化配置示例

    const path = require('path')
    const mock = require('express-mock-api');
    
    app.use(mock({
        root:   path.resolve('./mock'),  // 这里指定mock文件夹
        ignore: '/public/'               // 这里设置忽略的请求路径
    }));

## mock配置文件

注意：
* 文件名称必须是 mock.config.js
* 文件必须放置在“mock文件夹”下

### mock配置文件示例

    module.exports = {
        hot: true,  // 是否进行热替换。如果为true表示，修改这个文件会即时生效
        
        paths: {
            "/don't/mock/this/path/": false,
            "/mock/by/function/": function() {...}, // 这是一个方法
            "/user/:id": require('./user/id')       // 加载处理文件，其实同上，也是一个方法
        }
    }
    
### paths说明

paths是一个map对象，键名为匹配Url的规则，键值为匹配成功后要进行的处理。

**键名**

1. 键名可以是一个URL路径（不包括host和search部分），也可以是混合正则的格式，关于这种格式详见：[path-to-reg](https://www.npmjs.com/package/path-to-regexp)
2. 匹配一个键名，那就执行后面对应的处理；如果没有匹配，那就自动在mock文件夹中按照对应的路径寻找文件，如果该存在，那就参见《mock文件说明》

**键值**

键值不同的值代表要进行不同的处理，有如下几种情况：
1. 如果值为 true，那就自动在mock文件夹中按照对应的路径寻找文件，如果该存在，那就参见《mock文件说明》
2. 如果值为 false，则表示不使用该路径对应的mock数据
3. 如果值为 一个方法，则表示当有匹配的请求时，需要调用这个方法。示例如下：
>   function(req, res) {
>       res.json({
>           "result": "ok"
>       })
>   }

## 最佳实践

1. **每个接口对应一个文件**：这样可以便捷的编辑接口返回内容
2. **mock文件的路径要与接口地址对应**：这样便于系统自动mock接口请求
3. 新加一个mock文件时，只需要在对应的位置放置该文件接口立即生效
4. 不需要mock某个URL时，可以删除该文件，也可以在 Mock配置中设置该路径的值为 false，建议采用第二种方式

## 文件路径说明

* 假定项目目录为 {ProjectRoot}
* mock文件夹为 {ProjectRoot}/mock
* mock配置文件为 {ProjectRoot}/mock/mock.config.js
* 假定需要mock的一个接口为 /need/mock/me.do，那么对应的mock文件应为：{ProjectRoot}/mock/need/mock/me.do
