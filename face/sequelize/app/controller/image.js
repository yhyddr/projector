'use strict';

const Controller = require('egg').Controller;
// To-do: aliyun client should be resultful API. It's simple to add timeout etc. attribute.
const Core = require('@alicloud/pop-core');
const { performance } = require('perf_hooks');
const fs = require('fs');

// emitter config
const emitterKey = 'DdYjd8w_zH4UTj3OLWOqM8kSmbk9c68H';
const emitterChannel = 'personinfo';
const ec = require('emitter-io').connect({ host: "127.0.0.1", port: "8080" })

// aliyun config
const aliyunTimeOut = 2000
const aliyunGroups = 'workers'
const aliyunImageNumber = 'front'
const accessKeyId = 'LTAI4FcUTY6C6mReK4Eq8Bqz'
const accessKeySecret = 'WWwUZiaub9v17retzjuF6AmxcuEJ38'
const aliyunEndpoint = 'https://face.cn-shanghai.aliyuncs.com'


async function face(ctx) {
  const client = new Core({
    accessKeyId: accessKeyId,
    accessKeySecret: accessKeySecret,
    endpoint: aliyunEndpoint,
    apiVersion: '2018-12-03'
  });

  const requestOption = {
    method: 'POST'
  }
  
  for (let i = 0; i < ctx.request.body.imageurl.length; i++) {
    let start = performance.now()
    let params = {
      "Group": aliyunGroups,
      "Content": ctx.request.body.imageurl[i]
      // "ImageUrl": ctx.queries.imageurl[0]
    }

    let timeout = false
    var j = setTimeout(() => { timeout = true }, aliyunTimeOut)
    // set timeout 2000 ms 
    client.request('RecognizeFace', params, requestOption).then(async (result) => {
      if (timeout == true) {
        ctx.logger.warn(`timeout`)
        ec.publish({
          key: emitterKey,
          channel: emitterChannel,
          message: JSON.stringify("timeout")
        });
        return
      }
      clearTimeout(j)

      // var dataBuffer = new Buffer(ctx.request.body.imageurl[i], 'base64');
      // fs.writeFile(`../image/${result.Data[0].person}-${result.Data[0].score}.png`, dataBuffer, function (err) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //   }
      // });
      // console.log('face yes ------------------- '+result.Data[0].score)

      ctx.logger.info(`This image ${result.Data[0].person} score is ${result.Data[0].score}`)
      // 3. get personinfo from person id
      // console.log(result.Data[0])
      const userinfo = await ctx.service.user.find(ctx.helper.parseInt(result.Data[0].person));

      userinfo.dataValues.timespend =  performance.now()-start;
      userinfo.dataValues.score = result.Data[0].score
      // console.log(userinfo.dataValues)
      // publish a message to the chat channel
      ec.publish({
        key: emitterKey,
        channel: emitterChannel,
        message: JSON.stringify(userinfo.dataValues)
      });
    }, (ex) => {
      console.log(ex);
      console.timeEnd(`face${i}`)
    })
  }
}

class ImageInfoController extends Controller {
  async index() {
    // 1. get image path
    const ctx = this.ctx;
    // console.log("body" + ctx.request.body.imageurl.length)
    console.time('face')
    // get image and call aliyun face Endpoint
    face(ctx)
    console.timeEnd('face')
    // 4. notify caller wait for info on emitter channel
    ctx.status = 200;
    ctx.body = {
      "please subscribe this channel to receive notifications": "personinfo"
    }
  }

  add() {
    const ctx = this.ctx;

    const client = new Core({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: aliyunEndpoint,
      apiVersion: '2018-12-03'
    });

    let params = {
      "Group": aliyunGroups,
      "Person": ctx.queries.person[0],
      "Image": ctx.queries.aliyunImageNumber[0] || aliyunImageNumber,
      // "Content": ctx.queries.imageurl[0]
      "ImageUrl" : ctx.queries.imageurl[0]
    }

    console.log("params: ", params)
    const requestOption = {
      method: 'POST'
    };

    client.request('AddFace', params, requestOption).then((result) => {
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ctx.queries.imageurl)
      console.log(ex);
    })

    ctx.body = {
      name: ctx.queries.person[0],
      imageurl: ctx.queries.imageurl[0]
    }
  }

  addByBase64() {
    const ctx = this.ctx;

    const client = new Core({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: aliyunEndpoint,
      apiVersion: '2018-12-03'
    });

    let params = {
      "Group": aliyunGroups,
      "Person": ctx.query.person,
      "Image": ctx.query.aliyunImageNumber || aliyunImageNumber,
      "Content": ctx.query.imageurl
      // "ImageUrl" : ctx.query.imageurl
    }

    console.log("params: ", params)
    const requestOption = {
      method: 'POST'
    };

    client.request('AddFace', params, requestOption).then((result) => {
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ctx.query.imageurl)
      console.log(ex);
    })

    ctx.body = {
      name: ctx.query.person,
      imageurl: ctx.query.imageurl
    }
  }

  destroy() {
    const ctx = this.ctx;
    const client = new Core({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: aliyunEndpoint,
      apiVersion: '2018-12-03'
    });

    let params = {
      "Group": aliyunGroups,
      "Image": ctx.query.aliyunImageNumber || aliyunImageNumber,
      "Person":  ctx.query.person
    }

    console.log(params)
    const requestOption = {
      method: 'POST'
    };

    client.request('DeleteFace', params, requestOption).then((result) => {
      console.log('delete '+ctx.queries.person[0] + ' '+ ctx.query.aliyunImageNumber+ ' ' +aliyunImageNumber)
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ex);
    })
  }

  list() {
    const ctx = this.ctx;
    const client = new Core({
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      endpoint: aliyunEndpoint,
      apiVersion: '2018-12-03'
    });

    let params = {
      "Group": aliyunGroups,
    }

    const requestOption = {
      method: 'POST'
    };

    client.request('ListFace', params, requestOption).then((result) => {
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ex);
    })
  }
}

module.exports = ImageInfoController;
