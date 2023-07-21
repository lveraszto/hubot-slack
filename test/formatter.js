var should;

should = require('should');

describe('incoming()', function() {
  return it('Should do nothing if there are no user links', function() {
    var foo;
    foo = this.formatter.incoming({
      text: 'foo'
    });
    return foo.should.equal('foo');
  });
});

describe('links()', function() {
  it('Should decode entities', function() {
    var foo;
    foo = this.formatter.links('foo &gt; &amp; &lt; &gt;&amp;&lt;');
    return foo.should.equal('foo > & < >&<');
  });
  it('Should change <@U123> links to @name', function() {
    var foo;
    foo = this.formatter.links('foo <@U123> bar');
    return foo.should.equal('foo @name bar');
  });
  it('Should change <@U123|label> links to @label', function() {
    var foo;
    foo = this.formatter.links('foo <@U123|label> bar');
    return foo.should.equal('foo @label bar');
  });
  it('Should change <#C123> links to #general', function() {
    var foo;
    foo = this.formatter.links('foo <#C123> bar');
    return foo.should.equal('foo #general bar');
  });
  it('Should change <#C123|label> links to #label', function() {
    var foo;
    foo = this.formatter.links('foo <#C123|label> bar');
    return foo.should.equal('foo #label bar');
  });
  it('Should change <!everyone> links to @everyone', function() {
    var foo;
    foo = this.formatter.links('foo <!everyone> bar');
    return foo.should.equal('foo @everyone bar');
  });
  it('Should change <!channel> links to @channel', function() {
    var foo;
    foo = this.formatter.links('foo <!channel> bar');
    return foo.should.equal('foo @channel bar');
  });
  it('Should change <!group> links to @group', function() {
    var foo;
    foo = this.formatter.links('foo <!group> bar');
    return foo.should.equal('foo @group bar');
  });
  it('Should change <!here> links to @here', function() {
    var foo;
    foo = this.formatter.links('foo <!here> bar');
    return foo.should.equal('foo @here bar');
  });
  it('Should change <!subteam^S123|@subteam> links to @subteam', function() {
    var foo;
    foo = this.formatter.links('foo <!subteam^S123|@subteam> bar');
    return foo.should.equal('foo @subteam bar');
  });
  it('Should change <!foobar|hello> links to hello', function() {
    var foo;
    foo = this.formatter.links('foo <!foobar|hello> bar');
    return foo.should.equal('foo hello bar');
  });
  it('Should leave <!foobar> links as-is when no label is provided', function() {
    var foo;
    foo = this.formatter.links('foo <!foobar> bar');
    return foo.should.equal('foo <!foobar> bar');
  });
  it('Should remove formatting around <http> links', function() {
    var foo;
    foo = this.formatter.links('foo <http://www.example.com> bar');
    return foo.should.equal('foo http://www.example.com bar');
  });
  it('Should remove formatting around <https> links', function() {
    var foo;
    foo = this.formatter.links('foo <https://www.example.com> bar');
    return foo.should.equal('foo https://www.example.com bar');
  });
  it('Should remove formatting around <skype> links', function() {
    var foo;
    foo = this.formatter.links('foo <skype:echo123?call> bar');
    return foo.should.equal('foo skype:echo123?call bar');
  });
  it('Should remove formatting around <https> links with a label', function() {
    var foo;
    foo = this.formatter.links('foo <https://www.example.com|label> bar');
    return foo.should.equal('foo label (https://www.example.com) bar');
  });
  it('Should remove formatting around <https> links with a substring label', function() {
    var foo;
    foo = this.formatter.links('foo <https://www.example.com|example.com> bar');
    return foo.should.equal('foo https://www.example.com bar');
  });
  it('Should remove formatting around <https> links with a label containing entities', function() {
    var foo;
    foo = this.formatter.links('foo <https://www.example.com|label &gt; &amp; &lt;> bar');
    return foo.should.equal('foo label > & < (https://www.example.com) bar');
  });
  it('Should remove formatting around <mailto> links', function() {
    var foo;
    foo = this.formatter.links('foo <mailto:name@example.com> bar');
    return foo.should.equal('foo name@example.com bar');
  });
  it('Should remove formatting around <mailto> links with an email label', function() {
    var foo;
    foo = this.formatter.links('foo <mailto:name@example.com|name@example.com> bar');
    return foo.should.equal('foo name@example.com bar');
  });
  return it('Should change multiple links at once', function() {
    var foo;
    foo = this.formatter.links('foo <@U123|label> bar <#C123> <!channel> <https://www.example.com|label>');
    return foo.should.equal('foo @label bar #general @channel label (https://www.example.com)');
  });
});

describe('flatten()', function() {
  it('Should return a basic message passed untouched', function() {
    var foo;
    foo = this.formatter.flatten({
      text: 'foo'
    });
    return foo.should.equal('foo');
  });
  return it('Should concatenate attachments', function() {
    var foo;
    foo = this.formatter.flatten({
      text: 'foo',
      attachments: [
        {
          fallback: 'bar'
        },
        {
          fallback: 'baz'
        },
        {
          fallback: 'qux'
        }
      ]
    });
    return foo.should.equal('foo\nbar\nbaz\nqux');
  });
});

describe('warnForDeprecation()', function() {
  return it('Should warn of deprecation', function() {
    var logger, ref;
    ({logger} = this.slackbot.robot);
    this.formatter.warnForDeprecation();
    return (ref = this.stubs.robot.logger.logs) != null ? ref.warning.length.should.equal(1) : void 0;
  });
});
