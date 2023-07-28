'use strict';

describe('incoming()', function() {
  it('Should do nothing if there are no user links', function() {
    const foo = this.formatter.incoming({ text: 'foo' });
    expect(foo).eql('foo');
  });
});

describe('links()', function() {
  it('Should decode entities', function() {
    const foo = this.formatter.links('foo &gt; &amp; &lt; &gt;&amp;&lt;');
    expect(foo).eql('foo > & < >&<');
  });
  it('Should change <@U123> links to @name', function() {
    const foo = this.formatter.links('foo <@U123> bar');
    expect(foo).eql('foo @name bar');
  });
  it('Should change <@U123|label> links to @label', function() {
    const foo = this.formatter.links('foo <@U123|label> bar');
    expect(foo).eql('foo @label bar');
  });
  it('Should change <#C123> links to #general', function() {
    const foo = this.formatter.links('foo <#C123> bar');
    expect(foo).eql('foo #general bar');
  });
  it('Should change <#C123|label> links to #label', function() {
    const foo = this.formatter.links('foo <#C123|label> bar');
    expect(foo).eql('foo #label bar');
  });
  it('Should change <!everyone> links to @everyone', function() {
    const foo = this.formatter.links('foo <!everyone> bar');
    expect(foo).eql('foo @everyone bar');
  });
  it('Should change <!channel> links to @channel', function() {
    const foo = this.formatter.links('foo <!channel> bar');
    expect(foo).eql('foo @channel bar');
  });
  it('Should change <!group> links to @group', function() {
    const foo = this.formatter.links('foo <!group> bar');
    expect(foo).eql('foo @group bar');
  });
  it('Should change <!here> links to @here', function() {
    const foo = this.formatter.links('foo <!here> bar');
    expect(foo).eql('foo @here bar');
  });
  it('Should change <!subteam^S123|@subteam> links to @subteam', function() {
    const foo = this.formatter.links('foo <!subteam^S123|@subteam> bar');
    expect(foo).eql('foo @subteam bar');
  });
  it('Should change <!foobar|hello> links to hello', function() {
    const foo = this.formatter.links('foo <!foobar|hello> bar');
    expect(foo).eql('foo hello bar');
  });
  it('Should leave <!foobar> links as-is when no label is provided', function() {
    const foo = this.formatter.links('foo <!foobar> bar');
    expect(foo).eql('foo <!foobar> bar');
  });
  it('Should remove formatting around <http> links', function() {
    const foo = this.formatter.links('foo <http://www.example.com> bar');
    expect(foo).eql('foo http://www.example.com bar');
  });
  it('Should remove formatting around <https> links', function() {
    const foo = this.formatter.links('foo <https://www.example.com> bar');
    expect(foo).eql('foo https://www.example.com bar');
  });
  it('Should remove formatting around <skype> links', function() {
    const foo = this.formatter.links('foo <skype:echo123?call> bar');
    expect(foo).eql('foo skype:echo123?call bar');
  });
  it('Should remove formatting around <https> links with a label', function() {
    const foo = this.formatter.links('foo <https://www.example.com|label> bar');
    expect(foo).eql('foo label (https://www.example.com) bar');
  });
  it('Should remove formatting around <https> links with a substring label', function() {
    const foo = this.formatter.links('foo <https://www.example.com|example.com> bar');
    expect(foo).eql('foo https://www.example.com bar');
  });
  it('Should remove formatting around <https> links with a label containing entities', function() {
    const foo = this.formatter.links('foo <https://www.example.com|label &gt; &amp; &lt;> bar');
    expect(foo).eql('foo label > & < (https://www.example.com) bar');
  });
  it('Should remove formatting around <mailto> links', function() {
    const foo = this.formatter.links('foo <mailto:name@example.com> bar');
    expect(foo).eql('foo name@example.com bar');
  });
  it('Should remove formatting around <mailto> links with an email label', function() {
    const foo = this.formatter.links('foo <mailto:name@example.com|name@example.com> bar');
    expect(foo).eql('foo name@example.com bar');
  });
  return it('Should change multiple links at once', function() {
    const foo = this.formatter.links('foo <@U123|label> bar <#C123> <!channel> <https://www.example.com|label>');
    expect(foo).eql('foo @label bar #general @channel label (https://www.example.com)');
  });
});

describe('flatten()', function() {
  it('Should return a basic message passed untouched', function() {
    const foo = this.formatter.flatten({ text: 'foo' });
    expect(foo).eql('foo');
  });
  it('Should concatenate attachments', function() {
    const foo = this.formatter.flatten({
      text: 'foo',
      attachments: [{ fallback: 'bar' }, { fallback: 'baz' }, { fallback: 'qux' }]
    });
    expect(foo).eql('foo\nbar\nbaz\nqux');
  });
});

describe('warnForDeprecation()', function() {
  it('Should warn of deprecation', function(done) {
    const ref = this.stubs.robot.logger.logs;
    this.formatter.warnForDeprecation();
    if(ref) {
      expect(ref.warning.length).eql(1);
    }
    done();
  });
});
