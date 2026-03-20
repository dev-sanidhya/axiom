from {{agent_name}} import analyze

sample_csv = """month,revenue,region
Jan,1200,North
Feb,1450,North
Mar,,South
Apr,1100,West
"""

if __name__ == "__main__":
    print(analyze(sample_csv))
