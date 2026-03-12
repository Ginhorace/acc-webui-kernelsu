# acc-webui开发
由于acc的开发，很对相关的ui应用已经不能使用，加上命令行的完善，所以官方很推荐使用命令行的方式来使用acc。  
然而使用命令行需要用到额外的终端应用termux，再加上kernelsu支持使用webui界面控制模块，所以自然就有人想通过开发webui的方式实现控制acc使用。  
在[telegram群组](https://t.me/vr25_xda)中确实有人想要开发[webui](https://t.me/acc_group/114745)。  
但是当时我的root环境为magisk，先天不支持webui，需要使用单独的[ksuwebui](https://github.com/5ec1cff/KsuWebUIStandalone)，并且发现体验并不完整，很多功能能看到界面但不能使用，所以我只是体验了一下就换回了原版并使用命令行使用。  
这过年回来后，增加了对root相关领域的兴趣，希望能做或者改进一些模块出来，并且由于刚更换了[apatch](https://github.com/bmax121/APatch)，以及发现acc好久没有更新了后，便有了改进[acc-webui](https://github.com/farrukh2002/acc-webui-kernelsu)的开始。（注意，github项目的页面并不成熟，需要下载telegram中的。）

## webui支持

[模块 Web界面](https://kernelsu.org/zh_CN/guide/module-webui.html)  
[apatch-的模块-webui](https://apatch.dev/zh_CN/faq.html#apatch-%E7%9A%84%E6%A8%A1%E5%9D%97-webui)  
这里便是官方介绍的web界面，可以看出apatch的支持是与kernelsu的一致的，所以对应的[api文档](https://www.npmjs.com/package/kernelsu)也是一致的。

## 远程调试webui
根据gemini说法，chrome支持远程调试，在[inspect](chrome://inspect)界面中连接手机，在打开的页面中选择inject即可。连接使用adb调试连接。  
[开发者文档-远程调试android设备](https://developer.chrome.com/docs/devtools/remote-debugging?hl=zh-cn)  
但是apatch设置中的启用webview调试没有效果，也没有找到debug版引用，[webuix](https://github.com/MMRLApp/WebUI-X-Portable)中的远程调试也不能使用，所以最后还是找的[ksuwebui](https://github.com/5ec1cff/KsuWebUIStandalone)有调试选项，打开后chrome终于能正常投屏以及调试了。（记住给电池无限制权限）
给apatach，电池无限制之后也能远程投影调试了，也要注意webview不要被干掉。

## 调试开发环境-vscode
由于webui的运行环境在apatch中，并且需要调用对象ksu，所以只能远程连接到指定的目录，然后修改。  
这里使用了mixplorer的ftp服务器，其他sftp服务器连接超时，samba1服务器连接不上，webdav能连接但是vscode没有合适插件使用。目前使用的方式是[RaiDrive](https://www.raidrive.com/)把ftp挂在成网络驱动器。

## coding with AI Debugging and Refactoring
在尝试使用了vs插件codebuddy一段时间后，我发现ai最适合的工作就是执行有确定流程确定方向的代码实现或者改造，重构代码对它来说就是最合适的；但是如果是遇到一个问题解决方案却不是完美的话，ai写出的代码通常也不会是合适的。  
在kernelsu环境中window.prompt有这个方法并非未定义，但是就是无法显示，所以AI在编写第三方prompt界面时依旧保留了对原生prompt的调用逻辑。

## ksu的定义和执行
exec的接口在[github](https://github.com/tiann/KernelSU/blob/423eefe38598ba8090bdc43144e7d5d25a412031/manager/app/src/main/java/me/weishu/kernelsu/ui/webui/WebViewInterface.kt#L68)里，npm模块中也实现了对ksu.exec的调用，但是原webui代码中还是重新编写了一遍代码以添加超时功能。

## acc未启用时 .disable
当magisk禁用模块时，会在模块文件夹中生成.disable文件，并且对/system 文件夹的映射也不会生效，所以此时环境中就没有acc可以执行。
如果想要直接执行sh，其中service.sh会对.disable文件判断导致不会启动。如果想要强行执行acc.sh ,比如/data/adb/modules/acc/acc.sh -v,然后执行到278行执行misc-functions.sh，由于此时accd没有初始化完成，isAccd为false，开始打印⏳ accd --init并等待初始化，但是由于模块禁用一直没有成功，后面473执行batt-interface.sh也没有生成$TMPDIR/.batt-interface.sh，作为检验_INIT成功的标志,后面不知为何卡在logf.sh的34行，acc-i.txt文件为空。所以模块未启用时一定不要强行执行。

## acc脚本学习
acc在安装时会通过下面代码创建可执行文件

```
###
! $magisk || {

  # create executable wrappers to avoid rebooting unnecessarily
  mkdir -p $installDir/system/bin

  for i in ${id}.sh:$id ${id}.sh:${id}d, ${id}.sh:${id}d. ${id}a.sh:${id}a service.sh:${id}d; do
    j=$installDir/system/bin/${i#*:}
    [ ! -h $j ] || rm $j
    echo "#!/system/bin/sh
#exec_wrapper
if [ -f $tmpd/.updated ]; then
  exec /dev/${i#*:} \"\$@\"
else
  exec . /data/adb/$domain/$id/${i%:*} \"\$@\"
fi" > $j
  done
}
```
生成"acc","acca","accd","accd,","accd.",其中脚本会通过变量 $0 存储的是调用命令时使用的名称。来通过文件名执行不同的逻辑
```
# aliases/shortcuts
# daemon_ctrl status (acc -D|--daemon): "accd,"
# daemon_ctrl stop (acc -D|--daemon stop): "accd."
[[ "$0" != *accd* ]] || {
  case $0 in
    *accd.) daemon_ctrl stop;;
    *) daemon_ctrl;;
  esac
  exit $?
}
```
其中，acc就是对应了```acc.sh ``` 打开向导。
acca  对应了```acca.sh```  针对前端进行了优化的 acc
accd 对应了```service.sh``` 启动重启daemon，这里由于没有读取config变量，所以无法在webui中使用，最好继续使用acc [config] -D restart
accd，对应了```acc.sh ``` 显示daemon进程状态
accd. 对应了```acc.sh ```停止daemon进程，这个在mixplorer中看不到

## 为了使用disablecharging ,由exec改用spawn。
```fun spawn(command: String, args: String, options: String?, callbackFunc: String)```
其中command是命令行指令，args可以拼接在命令行后面，处理方式如下：
```
if (!TextUtils.isEmpty(args)) {
            finalCommand.append(command).append(" ")
            JSONArray(args).let { argsArray ->
                for (i in 0 until argsArray.length()) {
                    finalCommand.append(argsArray.getString(i))
                    finalCommand.append(" ")
                }
            }
        } else {
            finalCommand.append(command)
        }
```
options为结构,处理方式也如下，processOptions保证这些变量在cmd前面。
```
interface SpawnOptions {
    cwd?: string,
    env?: { [key: string]: string }
}

private fun processOptions(sb: StringBuilder, options: String?) {
        val opts = if (options == null) JSONObject() else {
            JSONObject(options)
        }

        val cwd = opts.optString("cwd")
        if (!TextUtils.isEmpty(cwd)) {
            sb.append("cd ${cwd};")
        }

        opts.optJSONObject("env")?.let { env ->
            env.keys().forEach { key ->
                sb.append("export ${key}=${env.getString(key)};")
            }
        }
    }
```

## 充电开关
使用acc -ss:查看充电开关时，会查看$TMPDIR/ch-curr-ctrl-files的内容。
如果是第一次启动，经过accd --init，会把把ctrl-files.sh里的开关写入ch-curr-ctrl-files。如果此时没有插入充电线，这里面就只包含部分使用012控制的开关，如果插入了充电线，ch-curr-ctrl-files则会通过read-ch-curr-ctrl-files-p2.sh写入需要控制电流的开关。
想要补救可以通过插入充电线时，执行accd --init或者acc -t测试所有开关。

## 使用profiles
acca脚本编写了很多加快执行的指令
```
-D #查看状态
-i #打印信息
-s = #设置多条配置
-s d #打印默认属性
-s p #打印当前属性
```
acca 支持直接启用特定路径的config运行 acca [config] [option]
```
# custom config path
! eq "${1-}" "*/*" || {
  [ -f $1 ] || cp $config $1
  config=$1
  shift
}

```
以及通过环境变量修改config路径
```
: ${config:=$dataDir/config.txt}
```

根据上面的acca指令，我们可以通过使用acca替换acc实现在指定的config环境下工作，但是需要修改保存profile的方式保证与config格式一致
```
    . $config
```
config使用了脚本执行（Source）设置环境变量的方式实现工作，所以不能有语法错误。

acc似乎也支持使用export config的方式工作
```
acc.sh

# load generic functions
. $execDir/logf.sh
. $execDir/misc-functions.sh

misc-functions.sh
id=acc
domain=vr25
: ${isAccd:=false}
loopDelay=(3 9)
execDir=/data/adb/$domain/acc
export TMPDIR=/dev/.vr25/acc
dataDir=/data/adb/$domain/${id}-data
: ${config:=$dataDir/config.txt}
config_=$config

```

## 使用config参数
经过测试，之后会使用 ```export config=/storage/emulated/0/Documents/config/acc/config.txt```的方式修改profile。
但是由于ksu的命令的执行是每次都会开一个新环境，否则要不就是使用option里的env参数，要不就直接使用acca ${config}的方式
使用```ps -ef | grep [a]ccd.sh | tail -n 1 | sed 's/.*accd\.sh //'```在启动时获取accd执行的配置文件的路径，$TMPDIR/.acc-f-config表示 force-charing
[config]路径不能使用括号，否则会被当做变量拆开
acc 也支持  acc [config] [option] 写法。

todo 另外，使用Enable charging或Disable charging的时候，acc会关闭accd的执行，并且acc使用了while控制，所以一直会有一个acc -d/e 1h的进程，所以之后可能需要添加对其的监控来修改status按钮逻辑。

## acc初始化
service.sh作为[启动脚本](https://jesse205.github.io/MagiskChineseDocument/guides.html#%E5%90%AF%E5%8A%A8%E8%84%9A%E6%9C%AC)是会被root管理器开机启动的，在第一次启动执行初始化时耗时较长，但是初始化完成后就会执行accd.sh，并且不带配置路径，所以读取accd指令获取配置路径时，如果为空就是指默认路径。

todo 刚重启时读取config路径后面会跟着]也就是config.txt]，或者是很多行config结果