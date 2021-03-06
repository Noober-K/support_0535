const util = require('../../utils/util.js');

// pages/worker/worker.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    workerId: '',
    worker: {},
    comments: [],
    commentContent: '',
    commentsCount: 0,
    score: 0,
    avgScore: 0,
    avatarNone: "../../../images/dist/avatar-none.jpg",
    isDisplay: true,
    userInfo: {},
    openid: ''
  },
  /*
   * 生命周期函数--监听页面加载
   */

  onLoad: function (options) {
    this.setData({
      title: options.title
    })
    // console.log(options);//就是一个接收传递过来的参数的对象
    // 将获取到的人员ID赋值到当前页面
    this.setData({
      'workerId': options.id //（接受url传参，不限制只能传递id变量名，可以传递多个变量名值）
    })
    // this.onLoadGetUser();
    // 获取工作人员信息
    this.getWorkerInfo();
    // 获取评论列表
    this.getCommentList();
    // 获取评论数
    this.getCommentCount();
  },
  onLoadGetUser: function() {
    try {
      let userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        if (userInfo.length > 1) {
          this.setData({
            userInfo: userInfo,
            openid: userInfo.openid
          })
        } else {
          // 获取用户信息
          this.onGetUserInnfo();
          // 获取用户openid
          this.onGetUserOpenid();
        }
      } else {
        // 获取用户信息
        this.onGetUserInnfo();
        // 获取用户openid
        this.onGetUserOpenid();
      }
    } catch (e) {
      console.log(e)
    }
  },
  // 获取用户信息
  bindGetUserInfo: function (e) {
    const that = this
    wx.getUserInfo({
      success: function (res) {
        that.setData({
          userInfo: res.userInfo,
          isDisplay: true
        })
        that.data.userInfo.openid = that.data.openid
        wx.setStorageSync('userInfo', that.data.userInfo)
      }
    })
  },
  onGetUserInnfo() {
    // 查看是否授权
    const that = this
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userInfo'] === false) {
          // 未授权
          that.setData({
            isDisplay: false
          })
        } else if (res.authSetting['scope.userInfo'] === true) {
          // 已经授权
          wx.getUserInfo({
            success: function (res) {
              that.setData({
                userInfo: res.userInfo,
                isDisplay: true
              })
              that.data.userInfo.openid = that.data.openid
              wx.setStorageSync('userInfo', that.data.userInfo)
            }
          })
        } else {
          // res.authSetting['scope.userInfo']不存在的时候
          that.setData({
            isDisplay: false
          })
        }
      }
    })
  },
  onGetUserOpenid() {
    wx.cloud.callFunction({
      name: "login",
      success: res => {
        console.log("云函数【login】调用成功！", res);
        this.setData({
          openid: res.result.openid
        })
        this.data.userInfo.openid = this.data.openid
        wx.setStorageSync('userInfo', this.data.userInfo)
      },
      fail: err => {
        console.log("云函数【login】调用失败！", err)
      }
    })
  },
  // 获取工作人员信息
  getWorkerInfo() {
    const db = wx.cloud.database()
    // 查询当前用户所有的 counters
    db.collection('workers').where({
      _id: this.data.workerId
    }).get({
      success: res => {
        this.setData({
          // 将获取到的数据库信息通过setData的方式赋给页面
          'worker': res.data[0]
        })
        // console.log('[数据库] [查询记录] 成功: ', res.data[0])
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '列表获取失败，请联系管理员'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      },
    });
  },
  // 查询评论列表
  getCommentList() {
    const db = wx.cloud.database()
    // 查询当前用户所有的评论
    db.collection('comments').where({
      workerId: this.data.workerId
    }).orderBy('createDate', 'desc').get({
      success: res => {
        this.setData({
          'comments': res.data
        });
        console.log('[comments] [查询全部评论] 成功: ', res.data)
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '列表获取失败，请联系管理员'
        })
        console.error('[comments] [查询全部评论] 失败：', err)
      }
    })
  },
  getCommentCount() {
    wx.cloud.callFunction({
      // 云函数名称
      name: 'commentsCount',
      // 传给云函数的参数
      data: {
        workerId: this.data.workerId
      }
    }).then(res => {
      this.setData({
        'commentsCount': res.result.total
      }, () => {
        // 获取评分平均分
        this.getAvgScore()
      })
    }).catch(err => {
      console.log(err);
    })
  },
  getAvgScore() {
    let scores = 0;
    for (let i = 0; i < this.data.comments.length; i++) {
      scores += this.data.comments[i].score;
    }
    let avgScore = 0;
    if (this.data.commentsCount == 0) {
      avgScore = 0;
    } else {
      avgScore = scores / this.data.commentsCount;
      avgScore = avgScore.toFixed(1);
    }
    this.setData({
      avgScore: avgScore
    })
  },
  // 提交评论
  commentSubmit: function (e) {
    // console.log('form发生了submit事件，携带数据为：', e.detail.value)
    const db = wx.cloud.database()
    let el = e.detail.value
    db.collection('comments').add({
      data: {
        commentContent: el.commentContent,
        score: this.data.score,
        // inputer:  this.userInfo.nickName,
        // avatarUrl: this.userInfo.avatarUrl,
        workerId: this.data.workerId,
        replyId: this.data.replyId,
        date: util.formatDate(new Date()),
        createDate: new Date(),
        commentatorOpenid: this.data.openid,
        commentatorNickName: this.data.userInfo.nickName,
        commentatorAvatar: this.data.userInfo.avatarUrl,
        commentatorCity: this.data.userInfo.city
      },
      success: res => {
        // 在返回结果中会包含新创建的记录的 _id
        this.setData({
          commentContent: '',
          score: 0
        })
        wx.showToast({
          title: '评论成功',
        })
        this.getCommentList();
        this.getCommentCount();
        console.log('[数据库] [新增评论] 成功，评论 _id: ', res._id)
        // 保存后清空页面
        this.setData({
          form_info: '',
          isClear: true
        })
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '新增评论'
        })
        console.error('[数据库] [新增评论] 失败：', err)
      }
    })
    // 清空评论填写区域
    this.formReset();
  },
  // 清空评论填写区域
  formReset() {
    this.setData({
      score: 0,
      commentContent: ''
    })
  },
  // 添加下拉刷新（钩子函数）
  onPullDownRefresh() {
    this.getWorkerInfo();
    this.getCommentList();
    this.getCommentCount();
    // 还需要在函数里添加一下代码，用于完成加载后停止下拉刷新动画效果
    wx.stopPullDownRefresh() //手动刷新完成后停止下拉刷新动效
  },
  scoreChange: function (e) {
    this.setData({
      score: e.detail.score
    })
  },
  makePhoneCall: function () {
    console.log("立即联系")
  }
})