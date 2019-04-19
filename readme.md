# cocos creator 的 pomelo2 客户端连接库

这是一个用于和 pomelo2 做网络连接开发的代码库!

针对老的 pomelo 引擎做了相关优化和结构性改进, 更加方便快捷!

####Usage

使用 npm 安装, 支持 ts 和 js 编码

    npm install pomelo2-creator --save

初始化链接(ts)

    import { pomelo } from 'pomelo2-creator';

    const session = pomelo.cearot('ws://127.0.0.1:3001',{
        /// 认证函数( 自动重连 )
        auth: async ()=>{
            const info = await session.request('connector.session.login',{});
            return info;
        },
        /// 重试次数
        retry:99
    });

    /// 认证通过了
    session.on('ready',()=>{});