if (Meteor.isClient) {

  //TODO: hide takestack when stack has no cards
  //TODO: hide drawcard when stacks are full
  //TODO: Show Game is over, remove Game at last stacktake
  //TODO: Count up Score at End Game
  //TODO: Some styling
  //Meteor.subscribe("PlayersPlaying");
  PlayersPlaying = new Meteor.Collection("playersplaying");
  CurrentCard = new Meteor.Collection("currentcard");
  Stacks = new Meteor.Collection("stacks");
  Game = new Meteor.Collection("game");

  Template.hello.greeting = function () {
    //Players = new Meteor.collection("playersplaying");
    //console.log(Players.find({}));
    return "Welcome to Coloretto";
  };
  Accounts.ui.config({passwordSignupFields: 'USERNAME_AND_EMAIL'})

  //names = new Array;
  //function printnames(element, index, array) {
    //names.push(element.username);
  //}
  //PlayersPlaying.find().fetch().forEach(printnames);

  Template.hello.playersPlaying = function() {
    return PlayersPlaying.find({});
  }

  Template.hello.enoughPlayers = function() {
    return PlayersPlaying.find({}).count() >= 3;
  }
  Template.hello.gameinprogress = function() {
    return Game.find({}).fetch()[0];
  };

  Template.hello.events({
    'click .starter' : function () {
      console.log('tried to start');
      Meteor.call('gamestart');
    },
    'click .joiner' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined') {
          console.log("You pressed the button");
        if (Meteor.user()) {
          //PlayersPlaying.upsert(Meteor.user());
          protouser = Meteor.user();
          protouser.mycards = new Array();
          protouser.turn = PlayersPlaying.find({}).count();
          PlayersPlaying.insert(protouser);
          $('.joiner').hide();
        } else {
          alert('please login or create account first');
        }
      }
    }
  });

  Template.playerspace.playersPlaying = function() {
    return PlayersPlaying.find({});
  }
  Template.playerspace.playersPlaying.turn = function(PlayersPlaying) {
    return (this._id == Game.find({}).fetch()[0]['currentPlayer']);
  }
  Template.playerspace.playersPlaying.cardset = function() {
    cards = new Array;
    cards.sort();
    typeArray = new Array();
    endArray = new Array();
    while (cards.length>0) {
      index = 1;
      while ((cards[0] == cards[index]) && (index < cards.length)) {
        index += 1;
      }
      newCards = cards.splice(index);
      if (array('wild', 'plus').indexOf(cards[0]) != -1) {
        endArray.push(cards);
      } else {
        typeArray.push(cards);
      }
      cards = newCards;
    }
    typeArray.concat(endArray);
  }

  Template.gameboard.currentPlayer = function() {
    var cpuid = Game.find({}).fetch()[0].currentPlayer;
    return PlayersPlaying.find({_id: cpuid}).fetch()[0]['username'];
  }

  Template.gameboard.cardDrawn = function() {
    return CurrentCard.find({}).count();
  }
  Template.gameboard.currentCard = function() {
    return CurrentCard.find({}).fetch()[0].card;
  }
  Template.gameboard.stacks = function() {
    return Stacks.find({});
  }
  Template.gameboard.gameinprogress= function() {
    return Game.find({}).fetch()[0];
  }
  Template.gameboard.myTurn = function() {
    return (Meteor.userId() == Game.find({}).fetch()[0]['currentPlayer']);
  }
  Template.gameboard.lastRound = function() {
    return Game.find({}).fetch()[0]['lastround'];
  }
      uid = Meteor.userId();
  Template.gameboard.events({
    'click .drawer' : function() {
      Meteor.call('drawcard');
    },
    'click .stack' : function(event) {
      Meteor.call('addtostack', event.toElement.attributes.mid.value, uid);
    },
    'click .taker' : function(event) {
      Meteor.call('takestack', event.toElement.attributes.mid.value, uid);
    },
  })
  Handlebars.registerHelper('notThree', function(stacks, options) {
    if(stacks.length < 3) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });
  Handlebars.registerHelper('hasZero', function(stacks, options) {
    if(stacks.length == 0) {
      return options.inverse(stacks);
    } else {
      return options.fn(stacks);
    }
    console.log(options);
  });
}

if (Meteor.isServer) {
  //declaring our collections
  PlayersPlaying = new Meteor.Collection("playersplaying");
  Deck = new Meteor.Collection("deck");
  CurrentCard = new Meteor.Collection("currentcard");
  Stacks = new Meteor.Collection("stacks");
  Game = new Meteor.Collection("game");
  StackTakers = new Meteor.Collection("stacktakers");


  //cleaning our collections
  //comment back in for actual play
  PlayersPlaying.remove({});
  Deck.remove({});
  CurrentCard.remove({});
  Stacks.remove({});
  Game.remove({});
  StackTakers.remove({});

  Meteor.publish("PlayersPlaying", function(){
    return PlayersPlaying.find({});
  });
  Meteor.startup(function () {
    // code to run on server at startup
  });
  Meteor.methods({
    gamestart: function() {
      numberPlaying = PlayersPlaying.find({}).count();
      deckmake(numberPlaying);
      stacksmake(numberPlaying );
      Game.remove({});
      startingPlayerID = PlayersPlaying.find({}).fetch()[Math.floor(Math.random()*numberPlaying)]['_id'] ;
      Game.insert({currentPlayer: startingPlayerID});
    },
    drawcard: function() {
      CurrentCard.remove({});
      deck = Deck.find({}).fetch()[0]['cards'];
      Deck.remove({});
      CurrentCard.insert({card: deck.shift()});
      Deck.insert({cards: deck});
      console.log(deck.length);
      if (deck.length == 15) {
        var game = Game.find({}).fetch()[0];
        game.lastround = true;
        console.log('lastround');
        Game.update({_id: game._id}, game);

      }
    },
    addtostack: function(stackID, uid) {
      cardsinstack = Stacks.find({_id:stackID}).fetch()[0].stack;
      cardsinstack.push(CurrentCard.find().fetch()[0].card);

      Stacks.update({_id: stackID}, {stack: cardsinstack});
      CurrentCard.remove({});
      Meteor.call('nextplayer', uid);

    },
    takestack: function(stackID, uid) {
      player = PlayersPlaying.find({_id:uid}).fetch()[0];
      myCards = player['mycards'];
      stack = Stacks.find({_id: stackID}).fetch()[0].stack;
      player.mycards = myCards.concat(stack);
      cardList = myCards.concat(stack);

      player.sortedcards = sortItRight(cardList);
      PlayersPlaying.update({_id:player._id}, player);
      Stacks.remove({_id: stackID});

      StackTakers.insert({_id: uid});

      Meteor.call('nextplayer', uid);

    },
    nextplayer: function(uid) {
      if (Stacks.find({}).count() == 0) {
        stacksmake(PlayersPlaying.find({}).count());
        StackTakers.remove({});
      } else {
        count = PlayersPlaying.find({_id:uid}).fetch()[0].turn;
        if (count == PlayersPlaying.find({}).count() - 1) {
          count = 0;
        } else {
          count += 1;
        }
        newPlayer = PlayersPlaying.find({turn: count}).fetch()[0]._id
        while (StackTakers.find({_id: newPlayer}).count() == 1) {
          count = PlayersPlaying.find({_id:newPlayer}).fetch()[0].turn;
          if (count == PlayersPlaying.find({}).count() - 1) {
            count = 0;
          } else {
            count += 1;
          }
          newPlayer = PlayersPlaying.find({turn: count}).fetch()[0]._id
        }
        Game.remove({});
        Game.insert({currentPlayer: newPlayer});
        return newPlayer;
      }
    },
  })

  function sortItRight(cards) {
    cards.sort();

    typeArray = new Array();
    endArray = new Array();
    while (cards.length>0) {
      index = 1;
      while ((cards[0] == cards[index]) && (index < cards.length)) {
        index += 1;
      }
      newCards = cards.splice(index);
      if (new Array('wild', 'plus').indexOf(cards[0]) != -1) {
        endArray.push(cards);
      } else {
        typeArray.push(cards);
      }
      cards = newCards;
    }
    typeArray.sort(function(a, b) { return a.length < b.length});
    return typeArray.concat(endArray);
  }
  function addDeckCard(count, card, deck) {
    while (count > 0) {
      deck.push(card)
      count -= 1;
    }
  }

  function deckmake(players) {
    if (players == 3) {
      colors = new Array('blue', 'purple', 'green', 'brown', 'red', 'orange');
      // colors = new Array('blue');
    } else {
      colors = new Array('blue', 'purple', 'green', 'yellow', 'brown', 'red', 'orange');
    }
    deck = new Array();
    colors=_.shuffle(colors);

    //give each player their starting card
    starting_cards = colors.slice(0, players);

    PlayersPlaying.find({}).fetch().forEach(function(element, index, array) {
      element.mycards = new Array(starting_cards[index]);
      element.sortedcards = new Array(new Array(starting_cards[index]));
      PlayersPlaying.update({_id:element._id}, element);
    });
    console.log('does this come out');

    colors.forEach(function(element, index, array) {
      if (starting_cards.indexOf(element) != -1) {
        addDeckCard(8, element, deck);
      } else {
        addDeckCard(9, element, deck);
      }
    });
    addDeckCard(3, 'wild', deck);
    addDeckCard(10, 'plus', deck);
    deck =_.shuffle(deck);
    Deck.insert({cards: deck});

  }
  function stacksmake(players) {
    Stacks.remove({});
    while (players > 0) {
      stack = 'stack_' + players
      Stacks.insert({stack: [], index: players});
      players -= 1;
    }
  }
}
