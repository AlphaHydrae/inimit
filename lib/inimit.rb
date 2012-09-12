require 'find'
require 'digest'
require 'paint'
require 'optparse'

# TODO: lenient option to only fail on mismatch

module Inimit
  VERSION = '0.0.2'

  class Opts < OptionParser
    def to_s
      "#{banner}\nOptions:\n#{summarize ''}"
    end
  end

  def self.run *args

    options = {
      :verbose => 0,
      :mismatch_only => false
    }
    Opts.new do |opts|
      opts.banner = "#{Paint[opts.program_name, :bold]} recursively compares files.\n\nUsage:\n    inimit [OPTION]... [SOURCE] TARGET\n"
      opts.version = VERSION
      opts.on('-d', '--digest ALGORITHM', 'Use ALGORITHM to hash file contents (available: md5, sha1, sha256, sha384, sha512)') do |digest|
        options[:digest] = digest
      end
      opts.on('-m', '--mismatch', 'Only show files when missing or the content does not match') do
        options[:mismatch_only] = true
      end
      opts.on('-v', '--verbose', 'Increase verbosity (once: show hash prefixes, twice: show full hashes)') do
        options[:verbose] += 1
      end
      opts.on('-h', '--help', 'Show this help and exit'){ puts opts; exit 0 }
      opts.on('-u', '--usage', 'Show this help and exit'){ puts opts; exit 0 }
    end.parse! args

    # check number of args
    self.abort "A target directory must be given" if args.length < 1
    self.abort "Only one source and target must be given (got #{args.length} arguments)" if args.length > 2

    source, target = case args.length
    when 1
      [ '.', args.shift ]
    when 2
      [ args.shift, args.shift ]
    end

    if !File.exists?(source)
      self.abort "Unknown file or directory #{source}"
    elsif !File.file?(source) and !File.directory?(source)
      self.abort "Source #{source} is neither a file nor a directory"
    elsif File.file?(source) and !File.file?(target)
      self.abort "Source #{source} is a file, target #{target} is not"
    elsif File.directory?(source) and !File.directory?(target)
      self.abort "Source #{source} is a directory, target #{target} is not"
    end

    if File.directory? source
      self.compare source, target, options
    else
      self.compare_files source, target, options
    end
  end

  def self.compare source, target, options = {}

    source, target = File.expand_path(source), File.expand_path(target)

    puts
    puts "Comparing files in #{source} to #{target}."
    puts unless options[:mismatch_only]

    Dir.chdir source
    total, match, unknown, mismatch = 0, 0, 0, 0

    Find.find '.' do |file|

      # skip directories
      next unless File.file? file
      total += 1

      source_file = File.join source, file
      target_file = File.join target, file

      if !File.file? target_file
        unknown += 1
        puts Paint[" not found", :yellow]
        next
      end

      source_sha1 = self.hash source_file, options
      target_sha1 = self.hash target_file, options

      if source_sha1 == target_sha1
        match += 1
        unless options[:mismatch_only]
          print Paint[self.hash_notice(source_sha1, target_sha1, options), :green]
          puts " #{file.sub /^\.\//, ''}..."
        end
      else
        mismatch += 1
        print Paint[self.hash_notice(source_sha1, target_sha1, options), :red]
        puts " #{file.sub /^\.\//, ''}..."
      end
    end

    puts

    notice = "Checked #{total} files: "
    notice << Paint["#{match} identical", :green]
    notice << ", "
    notice << Paint["#{unknown} not found", :yellow]
    notice << ", "
    notice << Paint["#{mismatch} different", :red]

    puts notice
    puts

    exit 1 if unknown >= 1 or mismatch >= 1
  end

  def self.compare_files source, target, options = {}

    source_sha1, target_sha1 = self.hash(source, options), self.hash(target, options)

    puts

    if source_sha1 == target_sha1
      msg = "Files are identical"
      msg << " (#{self.hash_notice source_sha1, target_sha1, options})" if options[:verbose] >= 1
      msg << "."
      puts Paint[msg, :green]
      puts
    else
      msg = "The contents of the files do not match"
      msg << " (#{self.hash_notice source_sha1, target_sha1, options})" if options[:verbose] >= 1
      msg << "."
      puts Paint[msg, :red]
      puts
      exit 1
    end
  end

  def self.hash_notice h1, h2, options = {}
    if h1 == h2
      case options[:verbose]
      when 1; "#{h1[0,7]} == #{h2[0,7]}"
      when 2; "#{h1} == #{h2}"
      else; "identical"
      end
    else
      case options[:verbose]
      when 1..2; "#{h1} != #{h2}"
      else; "different"
      end
    end
  end

  def self.hash file, options = {}
    dig = case options[:digest]
    when 'md5'; Digest::MD5.new
    when 'sha256'; Digest::SHA256.new
    when 'sha384'; Digest::SHA384.new
    when 'sha512'; Digest::SHA512.new
    else; Digest::SHA1.new
    end
    File.open file, 'rb' do |io|
      dig.update io.readpartial(4096) while !io.eof
    end
    dig.hexdigest
  end

  def self.abort msg
    warn Paint[msg, :yellow]
    exit 2
  end
end
